interface CurveKey {
  KeyTime: number;
  KeyValue: number;
}

export class CurveTable {
  public keys: Array<[number, number]>;

  /**
   * @param data The curve table data
   */
  constructor(data: Array<CurveKey>) {
    this.keys = [];
    for (const [key, value] of Object.entries(data)) {
      this.keys.push([value['KeyTime'], value['KeyValue']]);
    }
  }

  /**
   * Read a value from curve table
   * @param key the key
   */
  public eval(key: number): number {
    let i: any = 0;

    for (let k in this.keys) {
      if (this.keys[k][0] > key) {
        i = k;
        break;
      } else {
        i = k;
      }
    }

    let prev = this.keys[i - 1];
    let next = this.keys[i];

    let fac = (key - prev[0]) / (next[0] - prev[0]);

    let final = prev[1] * (1 - fac) + next[1] * fac;

    return final;
  }
}
