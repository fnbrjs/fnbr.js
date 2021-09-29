/**
 * Represets an error thrown because the client does not have permission to perform a certain party related action
 */
class PartyPermissionError extends Error {
  constructor() {
    super();
    this.name = 'PartyPermissionError';
    this.message = 'The client does not have permission to perform this party action';
  }
}

export default PartyPermissionError;
