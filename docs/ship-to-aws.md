# Ship Mewsie to AWS — step-by-step

This is the operator's checklist. Follow top to bottom; each step has either a CLI command or a "click here in the AWS console" instruction. The two big design docs (`aws-deployment-brief.md`, `docker-quickstart.md`) sit underneath this — refer to them for rationale, not for the order of operations.

> **Assumption:** you have an AWS account, an IAM user with admin access, and the AWS CLI installed locally (`aws --version`).
> If not: install `awscli` via Homebrew → `aws configure` with an access key from IAM.

---

## Step 1 — Pick a region and create an ECR repo (5 min)

```bash
export AWS_REGION=eu-west-1                       # change if needed
aws ecr create-repository \
  --repository-name mewsie \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true
```

Note the `repositoryUri` it returns — looks like
`123456789012.dkr.ecr.eu-west-1.amazonaws.com/mewsie`.

---

## Step 2 — Push your local image to ECR (5 min)

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI=$ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/mewsie

# Authenticate Docker against ECR
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ECR_URI

# Tag and push
docker tag mewsie:latest $ECR_URI:latest
docker push $ECR_URI:latest
```

ECR console → Repositories → `mewsie` → you should see the image with a green check.

---

## Step 3 — Store secrets in AWS Secrets Manager (10 min)

Each env var becomes one secret. For each one:

```bash
aws secretsmanager create-secret \
  --name mewsie/anthropic-api-key \
  --secret-string "sk-ant-..." \
  --region $AWS_REGION
```

Repeat for: `mewsie/supabase-url`, `mewsie/supabase-service-key`,
`mewsie/confluence-email`, `mewsie/confluence-token`,
`mewsie/confluence-base-url`, `mewsie/firecrawl-api-key`,
`mewsie/allowed-origins`.

(`PORT` and `ENABLE_DB_WRITES` are non-secret — set them directly in the App Runner config.)

> **Tip:** AWS console → Secrets Manager → "Store a new secret" → "Other type" is faster than CLI if you prefer clicking.

---

## Step 4 — Create the App Runner service (10 min)

AWS console → App Runner → **Create service**:

1. **Source:** *Container registry* → *Amazon ECR* → browse → `mewsie:latest`
2. **Deployment trigger:** *Automatic* (App Runner watches ECR for new pushes)
3. **ECR access role:** *Create new* (App Runner needs read on ECR)
4. **Service settings**
   - Service name: `mewsie`
   - CPU: `0.5 vCPU`, Memory: `1 GB` (bump later if needed)
   - Port: `3005`
   - **Environment variables** (plain values):
     - `PORT=3005`
     - `ENABLE_DB_WRITES=true`
     - `NODE_ENV=production`
   - **Environment variables** (from Secrets Manager — one per secret you created in Step 3):
     - `ANTHROPIC_API_KEY` → `arn:...mewsie/anthropic-api-key`
     - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ALLOWED_ORIGINS`, etc.
5. **Health check:** path `/health`, interval `10s`, timeout `5s`, healthy threshold `1`, unhealthy threshold `3`
6. **Auto scaling:** min `1`, max `2` (start small)
7. **Networking:** default (public) is fine unless you also want to keep RDS private

Click **Create & deploy**. First deploy takes ~5 min. The service URL will look like
`https://xxxxx.eu-west-1.awsapprunner.com`.

Smoke-test:
```bash
curl https://xxxxx.eu-west-1.awsapprunner.com/health
```

---

## Step 5 — Hook up your domain (15 min)

1. **Request an ACM cert** for `mewsie.omniboost.com` (or your chosen subdomain) in the same region.
2. Validate via DNS (add the CNAME record ACM gives you to Route 53 / your DNS provider).
3. In App Runner → your service → **Custom domains** → add `mewsie.omniboost.com` and select the cert.
4. Add the CNAME / ALIAS App Runner gives you to your DNS.
5. After ~5 min, `https://mewsie.omniboost.com/health` should return `{"status":"ok"}`.

(Optional: put **CloudFront** in front if you want edge caching of static assets + WAF rules.)

---

## Step 6 — Update CORS for the new domain (1 min)

Update the `mewsie/allowed-origins` secret to include the production domain(s):
```bash
aws secretsmanager update-secret \
  --secret-id mewsie/allowed-origins \
  --secret-string "https://mewsie.omniboost.com,https://app.omniboost.com" \
  --region $AWS_REGION
```
App Runner will auto-redeploy when secrets change (or trigger manually via *Deploy* in the console).

---

## Step 7 — Set up GitHub Actions for auto-deploy (15 min)

A workflow is already in `.github/workflows/deploy.yml`. To activate it:

1. **Create an IAM role for GitHub OIDC** (one-time):
   - Trust policy lets GitHub Actions assume the role
   - Permissions: `AmazonEC2ContainerRegistryPowerUser` + `apprunner:StartDeployment`
   - Copy the role ARN
2. **Add GitHub secrets** (repo → Settings → Secrets and variables → Actions):
   - `AWS_DEPLOY_ROLE_ARN` → the role ARN from step 1
   - `APP_RUNNER_SERVICE_ARN` → from App Runner service overview
   - `ANTHROPIC_API_KEY` → for running tests in CI (use a *separate* dev key, not your prod key)
3. **Push to `main`** → tests run → image builds → pushes to ECR → App Runner redeploys. ~6 min end to end.

---

## Step 8 — Schedule the scraper (10 min)

The scraper is a separate process that refreshes the knowledge base every 24h.

Cleanest option: **ECS Fargate scheduled task** triggered by **EventBridge**.

1. ECS console → create cluster `mewsie` (Fargate)
2. Create task definition `mewsie-scraper`:
   - Image: same ECR URI as the API
   - Command override: `npm,run,sync`
   - Env vars from the same Secrets Manager entries
   - 0.5 vCPU / 1 GB
3. EventBridge → create rule with schedule `cron(0 3 * * ? *)` (3 AM UTC daily) → target = ECS task → pick the task definition
4. First run: trigger manually from the EventBridge rule to verify

(Quick-and-dirty alternative: skip this and run `docker compose run --rm scraper` on your laptop whenever knowledge needs refreshing.)

---

## Step 9 — Optional but recommended

- **CloudWatch alarms** on App Runner 5xx rate, memory > 80%, and `errors` table row count.
- **Move sessions to ElastiCache (Redis)** the day you set max instances > 1. Until then, keep `max=1`.
- **Migrate from Supabase to RDS** if you want everything inside the AWS account boundary. Schema is portable (see `backend/db/schema.sql`).
- **WAF** in front of App Runner via CloudFront for rate-limit / bot protection.

---

## What I (Claude) can do for you, and what only you can do

| Task | Who |
|---|---|
| Author Dockerfile, compose, CI workflow, deployment docs | done — Claude |
| Build/test the image locally | done — Claude |
| Push image to **your** ECR | **you** (needs your AWS creds) |
| Create AWS resources (ECR repo, App Runner, Secrets, IAM) | **you** (or hand the AWS CLI off to Claude with your creds available) |
| Configure DNS in Route 53 / your registrar | **you** |
| Add GitHub secrets | **you** (cannot be done from a local CLI) |
| Decide region, scaling, domain name | **you** |

If you want, I can **walk through each step with you in this terminal** once your AWS CLI is configured — most of the work is then 30 minutes of copy-paste commands.
