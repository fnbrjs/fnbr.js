/**
 * Represets an error thrown because the friendship invitee reached their friendship requests limit
 */
class InviteeFriendshipRequestLimitExceededError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'InviteeFriendshipRequestLimitExceededError';
    this.message = `The user ${query} reached their friendship requests limit`;

    this.query = query;
  }
}

export default InviteeFriendshipRequestLimitExceededError;
