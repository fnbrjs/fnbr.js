/**
 * Represents an error thrown because a party member does not exist
 */
class PartyMemberNotFoundError extends Error {
  /**
   * The query which resulted in this error
   */
  public query: string;

  /**
   * @param query The query which resulted in this error
   */
  constructor(query: string) {
    super();
    this.name = 'PartyMemberNotFoundError';
    this.message = `The party member "${query}" does not exist`;

    this.query = query;
  }
}

export default PartyMemberNotFoundError;
