/**
 * Represets an error thrown because a member (or the client) already joined a party
 */
class PartyAlreadyJoinedError extends Error {
  constructor() {
    super();
    this.name = 'PartyAlreadyJoinedError';
    this.message = 'The member (or the client) already joined this party';
  }
}

export default PartyAlreadyJoinedError;
