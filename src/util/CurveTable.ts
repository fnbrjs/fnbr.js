/* eslint-disable no-restricted-syntax */
export interface CurveKey {
  KeyTime: number;
  KeyValue: number;
}

/**
 * Represents a curve table used for STW power level calculations
 * @private
 */
class CurveTable {
  /**
   * The curve table's keys
   */
  public keys: [number, number][];

  /**
   * @param data The curve table's data
   */
  constructor(data: CurveKey[]) {
    this.keys = [];

    for (const value of data) {
      this.keys.push([value.KeyTime, value.KeyValue]);
    }
  }

  /**
   * Read a value from the curve table
   * @param key The key
   */
  public eval(key: number) {
    const index = this.keys.findIndex((k) => k[0] > key);

    const prev = this.keys[index - 1];
    const next = this.keys[index];

    const fac = (key - prev[0]) / (next[0] - prev[0]);
    const final = prev[1] * (1 - fac) + next[1] * fac;

    return final;
  }
}

export default CurveTable;
