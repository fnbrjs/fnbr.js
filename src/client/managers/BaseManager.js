/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
const Collection = require('@discordjs/collection');
const Base = require('../Base');

/**
 * Represents the base class for managers
 * @abstract
 * @extends {Base}
 */
class BaseManager extends Base {
  constructor(client, holds, iterable = []) {
    super(client);

    /**
     * The data structure belonging to this manager
     * @name BaseManager#holds
     * @type {Function}
     * @private
     * @readonly
     */
    Object.defineProperty(this, 'holds', { value: holds });

    /**
     * Holds the cache
     * @type {Collection}
     */
    this.cache = new Collection();
    if (iterable) for (const i of iterable) this.add(i);
  }

  /**
   * Inserts data into this Manager's cache
   * @private
   * @param {Object} data The data that should be inserted
   * @param {?string} id The data's id
   * @returns {?Object} The inserted data
   */
  add(data, id) {
    const existing = this.cache.get(id || data.id);
    if (existing && existing._patch) existing._patch(data);
    if (existing) return existing;

    this.cache.set(id || data.id, data);
    return data;
  }

  /**
   * Resolves a data entry to a data Object.
   * @param {string|Object} resolvable A resolvable of something in this Manager
   * @returns {?Object} An instance from this Manager
   */
  resolve(resolvable) {
    if (resolvable instanceof this.holds) return resolvable;
    if (typeof resolvable === 'string') return this.cache.get(resolvable) || null;
    return null;
  }
}

module.exports = BaseManager;
