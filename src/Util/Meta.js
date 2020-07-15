class Meta {
  constructor() {
    this.schema = {};
  }

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

  update(schema, isRaw) {
    Object.keys(schema).forEach((prop) => this.set(prop, schema[prop], isRaw));
  }

  remove(schema) {
    schema.forEach((k) => delete this.schema[k]);
  }
}

module.exports = Meta;
