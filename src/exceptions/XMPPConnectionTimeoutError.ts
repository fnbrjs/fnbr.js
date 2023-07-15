/**
 * Represents an error that is thrown when the XMPP connection timeout has been exceeded
 */
class XMPPConnectionTimeoutError extends Error {
  /**
   * The timeout in milliseconds
   */
  public timeoutMs: number;

  /**
   * @param timeoutMs The timeout in milliseconds
   */
  constructor(timeoutMs: number) {
    super();
    this.name = 'XMPPConnectionTimeoutError';
    this.message = `The XMPP connection timeout of ${timeoutMs}ms has been exceeded`;

    this.timeoutMs = timeoutMs;
  }
}

export default XMPPConnectionTimeoutError;
