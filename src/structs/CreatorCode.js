/**
 * Represents a Support-A-Creator code
 */
class CreatorCode {
  /**
   * @param {Object} client The main client
   * @param {Object} data The creator code data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The Support-A-Creator code
     * @type {string}
     */
    this.code = data.slug;

    /**
     * The owner of the Support-A-Creator code
     * @type {User}
     */
    this.owner = data.owner;

    /**
     * The status of a Support-A-Creator code
     * @type {CreatorCodeStatus}
     */
    this.status = data.status;

    /**
     * Whether the Support-A-Creator code is verified
     * @type {boolean}
     */
    this.verified = data.verified;
  }
}

module.exports = CreatorCode;
