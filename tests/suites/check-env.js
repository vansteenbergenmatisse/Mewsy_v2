/**
 * Suite 1: Environment variables
 * Checks that all required .env variables are present before anything else runs.
 */

const REQUIRED = [
  { key: 'ANTHROPIC_API_KEY', critical: true  },
  { key: 'PORT',              critical: false },
  { key: 'CONFLUENCE_EMAIL',  critical: false },
  { key: 'CONFLUENCE_TOKEN',  critical: false },
  { key: 'CONFLUENCE_BASE_URL', critical: false },
  { key: 'FIRECRAWL_API_KEY', critical: false },
];

export async function checkEnv({ pass, fail, skip, results }) {
  for (const { key, critical } of REQUIRED) {
    const val = process.env[key];
    if (val && val.trim().length > 0) {
      pass(`${key} is set`);
      results.push({ ok: true });
    } else if (critical) {
      fail(`${key} is missing`, 'This variable is required — add it to .env');
      results.push({ ok: false });
    } else {
      skip(`${key} not set`, 'optional for this feature');
      results.push({ ok: 'skip' });
    }
  }

  // Check ANTHROPIC_API_KEY looks like a real key
  const key = process.env.ANTHROPIC_API_KEY;
  if (key && !key.startsWith('sk-ant-')) {
    fail('ANTHROPIC_API_KEY format', 'Expected key starting with "sk-ant-"');
    results.push({ ok: false });
  } else if (key) {
    pass('ANTHROPIC_API_KEY format looks valid');
    results.push({ ok: true });
  }
}
