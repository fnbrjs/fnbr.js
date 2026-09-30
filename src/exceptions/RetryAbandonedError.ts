/**
 * Represents an error thrown because an HTTP request retry was abandoned
 */
class RetryAbandonedError extends Error {
  constructor() {
    super();
    this.name = 'RetryAbandonedError';
    this.message = 'The HTTP request retry was abandoned';
  }
}

export default RetryAbandonedError;
