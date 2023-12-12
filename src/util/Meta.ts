import type { Schema } from '../../resources/structs';

/**
 * Represents a key-value-based meta structure used for parties and party members
 * @private
 */
class Meta<T extends Schema> {
  /**
   * The key-value schema
   */
  public schema: T;

  /**
   * @param schema The key-value schema
   */
  constructor(schema: T) {
    this.schema = schema || {};
  }

  /**
   * Adds a key-value pair to the schema
   * @param key The key
   * @param value The value
   * @param isRaw Whether the value should be added without further type checking
   * @returns A parsed version of the value
   */
  public set(key: keyof T & string, value: any, isRaw = false) {
    if (isRaw) {
      this.schema[key] = value.toString();
      return this.schema[key];
    }

    const keyType = key.slice(-1);
    if (keyType === 'j') {
      this.schema[key] = JSON.stringify(value) as any;
    } else if (keyType === 'U') {
      this.schema[key] = parseInt(value, 10).toString() as any;
    } else {
      this.schema[key] = value.toString();
    }

    return this.schema[key];
  }

  /**
   * Gets a value inside the schema by its key
   * @param key The key
   * @returns The value of the provided key
   */
  public get(key: keyof T & string) {
    const keyType = key.slice(-1);

    if (keyType === 'b') {
      return this.schema[key] === 'true';
    }

    if (keyType === 'j') {
      return typeof this.schema[key] !== 'undefined' ? JSON.parse(this.schema[key]!) : {};
    }

    if (keyType === 'U') {
      return typeof this.schema[key] !== 'undefined' ? parseInt(this.schema[key]!, 10) : undefined;
    }

    return typeof this.schema[key] !== 'undefined' ? this.schema[key]!.toString() : '';
  }

  /**
   * Updates the schema
   * @param schema The new schema
   * @param isRaw Whether the values are raw
   */
  public update(schema: Partial<T>, isRaw = false) {
    Object.keys(schema).forEach((prop: keyof T & string) => this.set(prop, schema[prop], isRaw));
  }

  /**
   * Deletes the provided keys
   * @param keys The keys to delete
   */
  public remove(keys: (keyof T & string)[]) {
    keys.forEach((k) => delete this.schema[k]);
  }
}

export default Meta;
