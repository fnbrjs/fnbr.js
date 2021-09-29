/**
 * Represets an error thrown because a creator code does not exist
 */
class CreatorCodeNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'CreatorCodeNotFoundError';
    this.message = `The Support-A-Creator code "${query}" does not exist`;

    this.query = query;
  }
}

export default CreatorCodeNotFoundError;
