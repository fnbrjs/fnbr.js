/**
 * Represets an error thrown because a match does not exist
 */
class MatchNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'MatchNotFoundError';
    this.message = `The match with the session id "${query}" does not exist`;

    this.query = query;
  }
}

export default MatchNotFoundError;
