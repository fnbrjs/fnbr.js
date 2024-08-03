/**
 * Represents an error that is thrown when the stomp websocket connection fails to be established
 */
class StompConnectionError extends Error {
  /**
   * The error status code
   */
  public statusCode: number;

  /**
   * @param error The error that caused the connection to fail
   */
  constructor(message: string, statusCode: number) {
    super();

    this.name = 'StompConnectionError';
    this.message = `Failed to connect to eos connect stomp: ${message} (status code ${statusCode})`;

    this.statusCode = statusCode;
  }
}

export default StompConnectionError;
