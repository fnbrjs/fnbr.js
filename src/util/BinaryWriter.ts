/**
 * Represents a writer for binary data used for tournament replays
 * @private
 */
class BinaryWriter {
  /**
   * The buffer
   */
  public buffer: Buffer;

  /**
   * The current byte offset
   */
  public offset: number;

  /**
   * @param buffer The buffer
   */
  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  /**
   * Skip bytes
   */
  skip(count: number) {
    this.offset += count;
    return this;
  }

  /**
   * Change the current buffer offset
   */
  goto(offset: number) {
    this.offset = offset;
    return this;
  }

  /**
   * Write an int8
   */
  writeInt8(value: number) {
    this.buffer.writeInt8(value, this.offset);
    this.offset += 1;
    return this;
  }

  /**
   * Write a uint8
   */
  writeUInt8(value: number) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += 1;
    return this;
  }

  /**
   * Write an int16
   */
  writeInt16(value: number) {
    this.buffer.writeInt16LE(value, this.offset);
    this.offset += 2;
    return this;
  }

  /**
   * Write a uint16
   */
  writeUInt16(value: number) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += 2;
    return this;
  }

  /**
   * Write an int32
   */
  writeInt32(value: number) {
    this.buffer.writeInt32LE(value, this.offset);
    this.offset += 4;
    return this;
  }

  /**
   * Write a uint32
   */
  writeUInt32(value: number) {
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += 4;
    return this;
  }

  /**
   * Write an int64
   */
  writeInt64(value: bigint) {
    this.buffer.writeBigInt64LE(value, this.offset);
    this.offset += 8;
    return this;
  }

  /**
   * Write a uint64
   */
  writeUInt64(value: bigint) {
    this.buffer.writeBigUInt64LE(value, this.offset);
    this.offset += 8;
    return this;
  }

  /**
   * Write a float32
   */
  writeFloat32(value: number) {
    this.buffer.writeFloatLE(value, this.offset);
    this.offset += 4;
    return this;
  }

  /**
   * Write a string
   */
  writeString(value: string, encoding: 'utf8' | 'utf16le' = 'utf8') {
    this.writeInt32(encoding === 'utf8' ? value.length + 1 : -(value.length + 1));
    this.writeBytes(Buffer.from(value, encoding));
    this.skip(encoding === 'utf8' ? 1 : 2);
    return this;
  }

  /**
   * Write a boolean
   */
  writeBool(value: boolean) {
    this.writeInt32(value === true ? 1 : 0);
    return this;
  }

  /**
   * Write multiple bytes
   */
  writeBytes(value: Buffer) {
    value.forEach((b, i) => {
      this.buffer[this.offset + i] = b;
    });

    this.offset += value.byteLength;
    return this;
  }

  /**
   * Write 16 bytes as a hex string
   */
  writeId(value: string) {
    this.writeBytes(Buffer.from(Buffer.from(value).toString('hex')));
    return this;
  }
}

export default BinaryWriter;
