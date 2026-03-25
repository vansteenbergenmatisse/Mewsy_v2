// Salesforce ticket creation — stub implementation.
// Connect when Salesforce credentials and API details are available.

// Shape of the session context object from session.ts
interface SessionContext {
  language: string | null;
  tools: string[];
  setupType: string | null;
  lastLoadedDocIds: string[];
  frustrationCounter: number;
  clarifyRoundCounter: number;
  previousQuestion: string | null;
}

// Return type for createTicket
interface TicketResult {
  success: boolean;
  ticketId: string | null;
  error: string | null;
}

/**
 * Creates a support ticket in Salesforce.
 * @param sessionContext - The full session context object from session.ts
 * @param issueDescription - Summary of the issue to file
 * @returns {Promise<{success: boolean, ticketId: string|null, error: string|null}>}
 */
export async function createTicket(_sessionContext: SessionContext, issueDescription: string): Promise<TicketResult> {
  // TODO: implement Salesforce REST API call
  // Required env vars: SALESFORCE_INSTANCE_URL, SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET
  console.log('[SALESFORCE STUB] createTicket called', { issueDescription });
  return { success: false, ticketId: null, error: 'Not implemented yet' };
}
