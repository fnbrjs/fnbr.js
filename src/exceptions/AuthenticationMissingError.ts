import type { AuthSessionStoreKey } from '../../resources/enums';

/**
 * Represents an error that is thrown when an authentication does not exist in the client's session store
 */
class AuthenticationMissingError extends Error {
  /**
   * The authentication type that does not exist
   */
  public type: AuthSessionStoreKey;

  /**
   * @param type The authentication type that does not exist
   */
  constructor(type: AuthSessionStoreKey) {
    super();
    this.name = 'AuthenticationMissingError';
    this.message = `The authentication "${type}" does not exist in the client's session store`;

    this.type = type;
  }
}

export default AuthenticationMissingError;
