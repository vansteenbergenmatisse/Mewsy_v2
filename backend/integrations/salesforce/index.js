// Salesforce ticket creation — stub implementation.
// Connect when Salesforce credentials and API details are available.

/**
 * Creates a support ticket in Salesforce.
 * @param {Object} sessionContext - The full session context object from session.js
 * @param {string} issueDescription - Summary of the issue to file
 * @returns {Promise<{success: boolean, ticketId: string|null, error: string|null}>}
 */
export async function createTicket(sessionContext, issueDescription) {
  // TODO: implement Salesforce REST API call
  // Required env vars: SALESFORCE_INSTANCE_URL, SALESFORCE_CLIENT_ID, SALESFORCE_CLIENT_SECRET
  console.log('[SALESFORCE STUB] createTicket called', { issueDescription });
  return { success: false, ticketId: null, error: 'Not implemented yet' };
}
