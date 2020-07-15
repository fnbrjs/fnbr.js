/* eslint-disable no-restricted-syntax */
/* eslint-disable no-useless-constructor */
/**
 * A Map used mainly for cached values throughout fnbr.js but with some extra functions.
 * Inspired by the simplicity of discord.js's collections.
 * @extends {Map}
 */
class List extends Map {
  constructor(iterable) {
    super(iterable);
  }

  get(key) {
    return super.get(key);
  }

  set(key, value) {
    return super.set(key, value);
  }

  delete(key) {
    return super.delete(key);
  }

  clear() {
    return super.clear();
  }

  toArray() {
    const listArray = [];
    for (const key of this.keys()) {
      const pushedObject = {};
      pushedObject[key] = this.get(key);
      listArray.push(pushedObject);
    }
    return listArray;
  }

  find(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return val;
    }
    return undefined;
  }

  filter(fn) {
    const filteredList = new List();
    for (const [key, val] of this) {
      if (fn(val, key, this)) filteredList.set(key, val);
    }
    return filteredList;
  }

  has(key) {
    return super.has(key);
  }

  some(fn) {
    for (const [key, val] of this) {
      if (fn(val, key, this)) return true;
    }
    return false;
  }

  map(fn) {
    const mappedList = new List();
    for (const [key, val] of this) {
      mappedList.set(key, fn(val, key, this));
    }
    return mappedList;
  }
}

module.exports = List;
