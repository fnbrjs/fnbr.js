interface Task {
  resolve: () => void;
  promise: Promise<void>;
}

/**
 * Represents an asynchronous task queue used for meta patches
 * @private
 */
class AsyncQueue {
  /**
   * The queued tasks
   */
  private tasks: Task[];
  constructor() {
    this.tasks = [];
  }

  /**
   * The amount of queued tasks
   */
  public get length() {
    return this.tasks.length;
  }

  /**
   * Adds a task to the queue
   */
  public wait() {
    const first = this.tasks.length ? this.tasks[this.tasks.length - 1].promise : Promise.resolve();

    let preResolve;
    const promise = new Promise<void>((res) => {
      preResolve = res;
    });
    const resolve = (preResolve as any) as () => void;

    this.tasks.push({ resolve, promise });

    return first;
  }

  /**
   * Resolves the first task from the queue
   */
  public shift() {
    const first = this.tasks.shift();
    if (typeof first !== 'undefined') first.resolve();
  }
}

export default AsyncQueue;
