/**
 * Represets an error thrown because the client reached its friendships limit
 */
class InviterFriendshipsLimitExceededError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'InviterFriendshipsLimitExceededError';
    this.message = 'The client reached its friendships limit';

    this.query = query;
  }
}

export default InviterFriendshipsLimitExceededError;
