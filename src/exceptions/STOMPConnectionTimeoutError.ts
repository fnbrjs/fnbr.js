class STOMPConnectionTimeoutError extends Error {
  public timeoutMs: number;
  constructor(timeoutMs: number) {
    super();
    this.name = 'STOMPConnectionTimeoutError';
    this.message = `The STOMP connection timeout of ${timeoutMs}ms has been exceeded`;

    this.timeoutMs = timeoutMs;
  }
}

export default STOMPConnectionTimeoutError;
