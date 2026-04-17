/**
 * identity.ts — User and customer resolution from browser token.
 * Called at the top of handleMessage() to resolve/create user + conversation.
 */

import { getSupabase } from './supabase.ts';
import { ENABLE_DB_WRITES } from '../config/mewsie.config.ts';

interface IdentityResult {
  userId: string;
  customerId: string | null;
  conversationId: string;
}

/**
 * Resolves or creates a user from a persistent browser token,
 * then resolves or creates a conversation for the given frontend session ID.
 * Returns { userId, customerId, conversationId }.
 *
 * When ENABLE_DB_WRITES is false, returns placeholder IDs.
 */
export async function resolveIdentity(
  browserToken: string,
  frontendSessionId: string,
  language: string | null
): Promise<IdentityResult> {
  if (!ENABLE_DB_WRITES) {
    return { userId: 'noop', customerId: null, conversationId: 'noop' };
  }

  const supabase = getSupabase();

  // 1. Resolve or create user
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, customer_id')
    .eq('browser_token', browserToken)
    .single();

  let userId: string;
  let customerId: string | null;

  if (existingUser) {
    userId = existingUser.id;
    customerId = existingUser.customer_id;
    // Update last_seen
    await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', userId);
  } else {
    // Create new user (no customer yet)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ browser_token: browserToken })
      .select('id')
      .single();

    if (error || !newUser) {
      console.error('[identity] failed to create user:', error?.message);
      return { userId: 'error', customerId: null, conversationId: 'error' };
    }
    userId = newUser.id;
    customerId = null;
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
      .update({ last_active_at: new Date().toISOString(), language })
      .eq('id', conversationId);
  } else {
    const { data: newConv, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, frontend_session_id: frontendSessionId, language })
      .select('id')
      .single();

    if (error || !newConv) {
      console.error('[identity] failed to create conversation:', error?.message);
      return { userId, customerId, conversationId: 'error' };
    }
    conversationId = newConv.id;
  }

  return { userId, customerId, conversationId };
}

/**
 * Links a user to a customer record, creating the customer if needed.
 * Called when detectTools() identifies an accounting system.
 */
export async function linkUserToCustomer(
  userId: string,
  accountingSystem: string,
  companyName?: string
): Promise<void> {
  if (!ENABLE_DB_WRITES) return;

  const supabase = getSupabase();

  // Check if user already has a customer
  const { data: user } = await supabase
    .from('users')
    .select('customer_id')
    .eq('id', userId)
    .single();

  if (user?.customer_id) {
    // Update existing customer's accounting system if not set
    await supabase
      .from('customers')
      .update({
        target_accounting_system: accountingSystem,
        ...(companyName ? { company_name: companyName } : {}),
      })
      .eq('id', user.customer_id)
      .is('target_accounting_system', null);
    return;
  }

  // Create new customer and link
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      target_accounting_system: accountingSystem,
      ...(companyName ? { company_name: companyName } : {}),
    })
    .select('id')
    .single();

  if (error || !newCustomer) {
    console.error('[identity] failed to create customer:', error?.message);
    return;
  }

  await supabase
    .from('users')
    .update({ customer_id: newCustomer.id })
    .eq('id', userId);
}
