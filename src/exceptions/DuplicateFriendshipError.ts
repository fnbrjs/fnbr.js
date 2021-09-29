/**
 * Represets an error thrown because a friendship already exists
 */
class DuplicateFriendshipError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'DuplicateFriendshipError';
    this.message = `The user "${query}" is already friends with the client`;

    this.query = query;
  }
}

export default DuplicateFriendshipError;
