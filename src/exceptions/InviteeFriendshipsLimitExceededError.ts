/**
 * Represents an error thrown because the friendship invitee reached their friendships limit
 */
class InviteeFriendshipsLimitExceededError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'InviteeFriendshipsLimitExceededError';
    this.message = `The user ${query} reached their friendships limit`;

    this.query = query;
  }
}

export default InviteeFriendshipsLimitExceededError;
