/**
 * Represents an error thrown because an offer does not exist (anymore)
 */
class OfferNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'OfferNotFoundError';
    this.message = `An offer with the id "${query}" does not exist`;

    this.query = query;
  }
}

export default OfferNotFoundError;
