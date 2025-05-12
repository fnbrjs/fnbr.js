/**
 * Represents an error that is thrown when the stomp websocket connection fails to be established
 */
class STOMPConnectionError extends Error {
  /**
   * The error status code
   */
  public statusCode?: number;

  /**
   * @param error The error that caused the connection to fail
   */
  constructor(message: string, statusCode?: number) {
    super();

    this.name = 'STOMPConnectionError';
    this.message = `Failed to connect to STOMP: ${message}`;

    this.statusCode = statusCode;
  }
}

export default STOMPConnectionError;
