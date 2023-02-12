interface LockPromise {
  promise: Promise<void>;
  resolve: () => void;
}

/**
 * Represents an asynchronous task lock used for pending token refreshing or party changes
 * @private
 */
class AsyncLock {
  /**
   * The lock promise
   */
  private lockPromise?: LockPromise;
  constructor() {
    this.lockPromise = undefined;
  }

  /**
   * Whether this lock is active
   */
  public get isLocked() {
    return !!this.lockPromise;
  }

  /**
   * Returns a promise that will resolve once the lock is released
   */
  public wait() {
    return this.lockPromise?.promise || Promise.resolve();
  }

  /**
   * Activates this lock
   */
  public lock() {
    let resolve: any;
    const promise = new Promise<void>((res) => {
      resolve = res;
    });

    this.lockPromise = { promise, resolve: resolve as () => void };
  }

  /**
   * Deactivates this lock
   */
  public unlock() {
    this.lockPromise?.resolve();
    this.lockPromise = undefined;
  }
}

export default AsyncLock;
