/**
 * Represents a meta structure used for parties
 * @private
 */
class Meta {
  /**
   */
  constructor() {
    this.schema = {};
  }

  /**
   * Sets a value
   * @param {string} prop The property
   * @param {*} val The value
   * @param {boolean} isRaw Whether the value is raw or not
   * @param {boolean} isObject Whether the value is an object or not
   * @returns {*} The setted value
   */
  set(prop, val, isRaw, isObject) {
    if (isObject) {
      this.schema[prop] = val;
      return this.schema[prop];
    }

    if (isRaw) {
      this.schema[prop] = val.toString();
      return this.schema[prop];
    }

    const propType = prop.match(/.$/g)[0];
    if (propType === 'j') {
      this.schema[prop] = JSON.stringify(val);
    } else if (propType === 'U') {
      this.schema[prop] = parseInt(val, 10).toString();
    } else {
      this.schema[prop] = val.toString();
    }
    return this.schema[prop];
  }

  /**
   * Gets a value by its property
   * @param {string} prop The property
   * @param {boolean} isRaw Whether the value should be returned raw
   * @returns {*} The value of the provided property
   */
  get(prop, isRaw) {
    if (isRaw) return this.schema[prop];

    const propType = prop.match(/.$/g)[0];

    if (propType === 'b') {
      if (typeof this.schema === 'undefined') return false;
      return !!((this.schema[prop] === true || this.schema[prop] === 'true'));
    }
    if (propType === 'j') {
      return typeof this.schema[prop] !== 'undefined' ? JSON.parse(this.schema[prop]) : {};
    }
    if (propType === 'U') {
      return typeof this.schema[prop] !== 'undefined' ? parseInt(this.schema[prop], 10) : {};
    }

    return typeof this.schema[prop] !== 'undefined' ? this.schema[prop].toString() : '';
  }

  /**
   * Updates the schema
   * @param {Object} schema The new schema
   * @param {boolean} isRaw Whether the values are raw or not
   * @returns {void}
   */
  update(schema, isRaw) {
    Object.keys(schema).forEach((prop) => this.set(prop, schema[prop], isRaw));
  }

  /**
   * Removes provided schema properties
   * @param {Array} schema The properties to delete
   * @returns {void}
   */
  remove(schema) {
    schema.forEach((k) => delete this.schema[k]);
  }
}

module.exports = Meta;
