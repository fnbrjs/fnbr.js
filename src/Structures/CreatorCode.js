/**
 * A creator code
 */
class CreatorCode {
  /**
   * @param {Object} client main client
   * @param {Object} data creator code data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The creator code
     */
    this.code = data.slug;

    /**
     * The owner of the code
     */
    this.owner = data.owner;

    /**
     * If the code is active
     */
    this.active = data.status === 'ACTIVE';

    /**
     * If the code is verified
     */
    this.verified = data.verified;
  }
}

module.exports = CreatorCode;
