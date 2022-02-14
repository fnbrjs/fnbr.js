/**
 * Represets an error thrown because an event timeout was exceeded
 */
class EventTimeoutError extends Error {
  /**
   * The event which resulted in this error
   */
  public event: string;

  /**
   * The timeout in milliseconds
   */
  public timeout: number;

  /**
   * @param event The query which resulted in this error
   * @param timeout The timeout in milliseconds
   */
  constructor(event: string, timeout: number) {
    super();
    this.name = 'EventTimeoutError';
    this.message = `Timeout of ${timeout}ms exceeded while waiting for the event "${event}"`;

    this.event = event;
    this.timeout = timeout;
  }
}

export default EventTimeoutError;
