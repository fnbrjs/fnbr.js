/**
 * Represets an error thrown because a friendship request has already been sent
 */
class FriendshipRequestAlreadySentError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'FriendshipRequestAlreadySentError';
    this.message = `The client already sent a friendship request to "${query}"`;

    this.query = query;
  }
}

export default FriendshipRequestAlreadySentError;
