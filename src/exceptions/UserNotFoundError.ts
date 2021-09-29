/**
 * Represets an error thrown because a user does not exist
 */
class UserNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'UserNotFoundError';
    this.message = `The user "${query}" does not exist`;

    this.query = query;
  }
}

export default UserNotFoundError;
