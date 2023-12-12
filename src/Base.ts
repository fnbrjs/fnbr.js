import type Client from './Client';

/**
 * Represents the base class of many other classes
 */
abstract class Base {
  /**
   * The main client
   */
  public readonly client!: Client;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    Object.defineProperty(this, 'client', { value: client });
  }
}

export default Base;
