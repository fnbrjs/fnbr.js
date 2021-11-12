/**
 * Represets an error thrown because a creative island does not exist
 */
class CreativeIslandNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'CreativeIslandNotFoundError';
    this.message = `A creative island with the code "${query}" does not exist`;

    this.query = query;
  }
}

export default CreativeIslandNotFoundError;
