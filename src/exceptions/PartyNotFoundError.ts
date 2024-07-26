/**
 * Represents an error thrown because a party does not exist
 */
class PartyNotFoundError extends Error {
  constructor() {
    super();
    this.name = 'PartyNotFoundError';
    this.message = 'The party wasn\'t found';
  }
}

export default PartyNotFoundError;
