/**
 * Represents the base class of many other classes
 * @abstract
 */
class Base {
  constructor(client) {
    /**
     * The main client
     * @name Base#client
     * @type {Client}
     * @readonly
     */
    Object.defineProperty(this, 'client', { value: client });
  }
}

module.exports = Base;
