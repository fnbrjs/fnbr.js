import type { StreamError } from 'stanza/protocol';

/**
 * Represents an error that is thrown when the XMPP connection fails to be established
 */
class XMPPConnectionError extends Error {
  /**
   * The error condition
   */
  public condition: string;

  /**
   * The (optional) error text
   */
  public text?: string;

  /**
   * @param error The error that caused the connection to fail
   */
  constructor(error: StreamError) {
    super();
    this.name = 'XMPPConnectionError';
    this.message = `The XMPP connection failed to be established: ${error.condition} - ${error.text}`;

    this.condition = error.condition;
    this.text = error.text;
  }
}

export default XMPPConnectionError;
