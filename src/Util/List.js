/* eslint-disable no-restricted-syntax */
/* eslint-disable no-useless-constructor */
/**
 * A Map used mainly for cached values throughout fnbr.js but with some extra functions.
 * Inspired by the simplicity of discord.js's collections.
 * @extends {Map}
 */
class List extends Map {
  /**
   * @param {Iterable} iterable The iterable that will be used to fill the List
   */
  constructor(iterable) {
    super(iterable);
  }

  /**
   * Finds a key in the List and returns its value
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map/get
   * @param {*} key key to find
   */
  get(key) {
    return super.get(key);
  }

  /**
   * Maps a key to a value
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map/set
   * @param {*} key key
   * @param {*} value value
   */
  set(key, value) {
    return super.set(key, value);
  }

  /**
   * Finds a key and delets the key-value-pair
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map/delete
   * @param {*} key key of the pair to delete
   */
  delete(key) {
    return super.delete(key);
  }

  /**
   * Clears the entire list
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map/clear
   */
  clear() {
    return super.clear();
  }

  /**
   * Returns a list of all key-value-pairs
   */
  toArray() {
    const listArray = [];
    for (const key of this.keys()) {
      const pushedObject = {};
      pushedObject[key] = this.get(key);
      listArray.push(pushedObject);
    }
    return listArray;
  }

  /**
   * Finds a value with a function
   * @param {Function} fn function
   */
  find(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return val;
    }
    return undefined;
  }

  /**
   * Filter this list
   * @param {Function} fn function
   * @returns {List}
   */
  filter(fn) {
    const filteredList = new List();
    for (const [key, val] of this) {
      if (fn(val, key, this)) filteredList.set(key, val);
    }
    return filteredList;
  }

  /**
   * Checks if list has a key
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Map/has
   * @param {*} key key
   */
  has(key) {
    return super.has(key);
  }

  /**
   * Checks if list has a value using a function
   * @param {Function} fn function
   */
  some(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return true;
    }
    return false;
  }

  /**
   * Maps this list (like Array.map)
   * @param {Function} fn function
   */
  map(fn) {
    const returnArray = [];
    for (const [key, val] of this) {
      returnArray.push(fn(val, key, this));
    }
    return returnArray;
  }
}

module.exports = List;
