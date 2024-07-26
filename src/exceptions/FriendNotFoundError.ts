/**
 * Represents an error thrown because a friend does not exist
 */
class FriendNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'FriendNotFoundError';
    this.message = `The friend "${query}" does not exist`;

    this.query = query;
  }
}

export default FriendNotFoundError;
