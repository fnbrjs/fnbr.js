import { Schema } from '../../resources/structs';

/**
 * Represents a key-value-based meta structure used for parties and party members
 * @private
 */
class Meta {
  /**
   * The key-value schema
   */
  public schema: Schema;

  /**
   * @param schema The key-value schema
   */
  constructor(schema?: Schema) {
    this.schema = schema || {};
  }

  /**
   * Adds a key-value pair to the schema
   * @param key The key
   * @param value The value
   * @param isRaw Whether the value should be added without further type checking
   * @param isObject Whether the value is an object
   * @returns A parsed version of the value
   */
  public set(key: string, value: any, isRaw = false, isObject = false) {
    if (isObject) {
      this.schema[key] = value;
      return this.schema[key];
    }

    if (isRaw) {
      this.schema[key] = value.toString();
      return this.schema[key];
    }

    const keyType = key.slice(-1);
    if (keyType === 'j') {
      this.schema[key] = JSON.stringify(value);
    } else if (keyType === 'U') {
      this.schema[key] = parseInt(value, 10).toString();
    } else {
      this.schema[key] = value.toString();
    }

    return this.schema[key];
  }

  /**
   * Gets a value inside the schema by its key
   * @param key The key
   * @param isRaw Whether the value should be returned raw
   * @returns The value of the provided key
   */
  public get(key: string, isRaw = false) {
    if (isRaw) return this.schema[key];

    const keyType = key.slice(-1);

    if (keyType === 'b') return this.schema[key] === true || this.schema[key] === 'true';

    if (keyType === 'j') return typeof this.schema[key] !== 'undefined' ? JSON.parse(this.schema[key]) : {};

    if (keyType === 'U') return typeof this.schema[key] !== 'undefined' ? parseInt(this.schema[key], 10) : undefined;

    return typeof this.schema[key] !== 'undefined' ? this.schema[key].toString() : '';
  }

  /**
   * Updates the schema
   * @param schema The new schema
   * @param isRaw Whether the values are raw
   */
  public update(schema: Schema, isRaw = false) {
    Object.keys(schema).forEach((prop) => this.set(prop, schema[prop], isRaw));
  }

  /**
   * Deletes the provided keys
   * @param schema The keys to delete
   */
  public remove(keys: string[]) {
    keys.forEach((k: string) => delete this.schema[k]);
  }
}

export default Meta;
