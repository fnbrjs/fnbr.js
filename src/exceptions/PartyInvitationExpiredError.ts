/**
 * Represents an error thrown because the client does not have permission to perform a certain action
 */
class PartyInvitationExpiredError extends Error {
  constructor() {
    super();
    this.name = 'PartyInvitationExpiredError';
    this.message = 'The party invitation expired or already got accepted / declined / aborted';
  }
}

export default PartyInvitationExpiredError;
