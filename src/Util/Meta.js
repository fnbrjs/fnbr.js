/**
 * A meta used for parties and party members
 */
class Meta {
  constructor() {
    this.schema = {};
  }

  /**
   * Set a value
   * @param {String} prop property
   * @param {*} val value
   * @param {Boolean} isRaw if the value is raw
   * @param {Boolean} isObject if the value is an object
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
   * Get a value for a property
   * @param {*} prop property
   * @param {Boolean} isRaw if the value should be returned raw
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
   * Update this schema
   * @param {Object} schema the new schema object
   * @param {Boolean} isRaw passed to Meta.set
   */
  update(schema, isRaw) {
    Object.keys(schema).forEach((prop) => this.set(prop, schema[prop], isRaw));
  }

  /**
   * Remove schema properties
   * @param {Array} schema the properties to delete
   */
  remove(schema) {
    schema.forEach((k) => delete this.schema[k]);
  }
}

module.exports = Meta;
