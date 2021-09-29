/**
 * Represets an error thrown because a party already reached its max member count
 */
class PartyMaxSizeReachedError extends Error {
  constructor() {
    super();
    this.name = 'PartyMaxSizeReachedError';
    this.message = 'The party reached its max member count';
  }
}

export default PartyMaxSizeReachedError;
