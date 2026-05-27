/**
 * identity.ts — User resolution from browser token or Base user ID.
 * Called at the top of handleMessage() to resolve/create user + conversation.
 *
 * After the customers/users merge, everything lives in the `users` table:
 * - browser_token (nullable) — set when someone opens the Mewsie widget
 * - base_user_id (nullable)  — set when Base syncs via /api/sync-context
 * - business fields (company_name, target_accounting_system) — enriched over time
 */

import { getSupabase } from './supabase.ts';
import { ENABLE_DB_WRITES } from '../config/mewsie.config.ts';

interface IdentityResult {
  userId: string;
  conversationId: string;
}

/**
 * Resolves or creates a user from a persistent browser token,
 * then resolves or creates a conversation for the given frontend session ID.
 * Returns { userId, conversationId }.
 *
 * When baseUserId is provided (iframe embed from Base), the function first
 * looks for an existing user with that base_user_id. If found, it attaches
 * the browser_token to that row — linking the browser session to the Base
 * identity in a single row (no duplicates).
 *
 * When ENABLE_DB_WRITES is false, returns placeholder IDs.
 */
export async function resolveIdentity(
  browserToken: string,
  frontendSessionId: string,
  language: string | null,
  baseUserId?: string | null
): Promise<IdentityResult> {
  if (!ENABLE_DB_WRITES) {
    return { userId: 'noop', conversationId: 'noop' };
  }

  // Only create/track users who are linked to Base.
  // Anonymous sessions (no baseUserId) skip all DB writes — no user row is created.
  if (!baseUserId) {
    return { userId: 'noop', conversationId: 'noop' };
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Resolve or create user via Base identity
  let userId: string;

  // Check if a user already exists with this base_user_id
  // (created earlier by /api/sync-context)
  const { data: baseUser } = await supabase
    .from('users')
    .select('id')
    .eq('base_user_id', baseUserId)
    .single();

  if (baseUser) {
    // Link: attach browser_token to the existing Base user row.
    // First check if this token already belongs to a different user —
    // if so, clear it from the old row to avoid a UNIQUE constraint crash.
    userId = baseUser.id;
    const { data: tokenOwner } = await supabase
      .from('users')
      .select('id')
      .eq('browser_token', browserToken)
      .single();

    if (tokenOwner && tokenOwner.id !== userId) {
      // Token belongs to a different user — detach it from the old row
      await supabase.from('users')
        .update({ browser_token: null })
        .eq('id', tokenOwner.id);
      console.log(`[identity] Detached browser_token from old user ${tokenOwner.id} before linking to ${baseUserId}`);
    }

    await supabase.from('users')
      .update({ browser_token: browserToken, last_seen: now })
      .eq('id', userId);
    console.log(`[identity] Linked browser_token to existing Base user ${baseUserId}`);
  } else {
    // SECURITY: /webhook/chat does NOT create users from a caller-supplied
    // baseUserId. The only authoritative create path is POST /api/sync-context,
    // which is gated by BASE_SYNC_SECRET. If we get here, Base's backend hasn't
    // synced this user yet — fall back to anonymous (no DB binding) instead of
    // letting a chat caller assert any baseUserId they want.
    //
    // The session itself still works (in-memory). When Base eventually syncs,
    // the next chat turn will hit the `baseUser` branch above and attach the
    // browser_token to the legitimate Base-created row.
    console.warn(`[identity] chat saw unknown base_user_id=${baseUserId} — refusing to create (no sync-context yet)`);
    return { userId: 'noop', conversationId: 'noop' };
  }

  // 2. Resolve or create conversation
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('frontend_session_id', frontendSessionId)
    .single();

  let conversationId: string;

  if (existingConv) {
    conversationId = existingConv.id;
    await supabase
      .from('conversations')
      .update({ last_active_at: now, language })
      .eq('id', conversationId);
  } else {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, frontend_session_id: frontendSessionId, language })
      .select('id')
      .single();

    if (error || !newConv) {
      console.error('[identity] failed to create conversation:', error?.message);
      return { userId, conversationId: 'error' };
    }
    conversationId = newConv.id;
  }

  return { userId, conversationId };
}

/**
 * Resolves a user by their Base user ID (from Omniboost's main product).
 * Returns user data if found, null otherwise.
 */
export async function resolveByBaseUserId(
  baseUserId: string
): Promise<{ userId: string; accountingSystem: string | null; tier: string | null; companyName: string | null } | null> {
  if (!ENABLE_DB_WRITES) return null;

  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('id, target_accounting_system, tier, company_name')
    .eq('base_user_id', baseUserId)
    .single();

  if (!user) return null;

  return {
    userId: user.id,
    accountingSystem: user.target_accounting_system,
    tier: user.tier,
    companyName: user.company_name,
  };
}

/**
 * Creates or updates a user from a Base user ID.
 * Called by POST /api/sync-context. Returns { userId, isNew }.
 *
 * Implementation note: uses a single atomic upsert with `onConflict: 'base_user_id'`
 * so two concurrent first-syncs for the same user can't both insert. The select-then-
 * insert pattern this replaced raced against itself and would leave one caller with
 * an error sentinel even though the row existed.
 *
 * Errors during the upsert throw — the calling route should surface a 500 so Base
 * notices the outage instead of receiving a misleading 200.
 */
export async function syncBaseUser(
  baseUserId: string,
  accountingSystem: string | null,
  tier: string | null,
  companyName: string | null
): Promise<{ userId: string; isNew: boolean }> {
  if (!ENABLE_DB_WRITES) return { userId: 'noop', isNew: false };

  const supabase = getSupabase();

  // Detect "new vs existing" up front so we can report isNew honestly to Base.
  // The race window between this select and the upsert is harmless: even if a
  // concurrent caller wins the insert, our upsert below collapses to an UPDATE
  // via onConflict, and we still return a valid id.
  const existing = await resolveByBaseUserId(baseUserId);

  // Only include fields the caller actually set — otherwise an undefined value
  // overwrites a previously-stored real value on subsequent syncs.
  const row: Record<string, string> = { base_user_id: baseUserId };
  if (accountingSystem) row.target_accounting_system = accountingSystem;
  if (tier) row.tier = tier;
  if (companyName) row.company_name = companyName;

  const { data: upserted, error } = await supabase
    .from('users')
    .upsert(row, { onConflict: 'base_user_id' })
    .select('id')
    .single();

  if (error || !upserted) {
    console.error('[identity] failed to upsert base user:', error?.message);
    throw new Error(`identity: failed to upsert user for base_user_id (${error?.message ?? 'no row returned'})`);
  }

  return { userId: upserted.id, isNew: existing === null };
}

/**
 * Updates the accounting system (and optionally company name) on a user record.
 * Called when detectTools() identifies an accounting system during chat.
 */
export async function updateUserAccountingSystem(
  userId: string,
  accountingSystem: string,
  companyName?: string
): Promise<void> {
  if (!ENABLE_DB_WRITES) return;

  const supabase = getSupabase();

  const updates: Record<string, string> = {};
  if (accountingSystem) updates.target_accounting_system = accountingSystem;
  if (companyName) updates.company_name = companyName;
  if (Object.keys(updates).length > 0) {
    await supabase.from('users').update(updates).eq('id', userId);
  }
}
