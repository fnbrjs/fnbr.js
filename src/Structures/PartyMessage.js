/* eslint-disable no-return-await */
/**
 * Represents a party message
 */
class PartyMessage {
  constructor(client, data) {
    /**
      * @param {Client} client The main client
      * @param {Object} data The data of the message
      */
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });
    Object.defineProperty(this, 'chat', { value: this.data.chat });

    /**
     * The content of the party message
     * @type {string}
     */
    this.content = data.body;

    /**
     * The author of the party message
     * @type {PartyMember}
     */
    this.author = data.author;
  }

  /**
   * Replies to this party message
   * @param {string} message The message
   * @returns {Promise<PartyMessage>}
   */
  async reply(message) {
    return await this.chat.send(message);
  }
}

module.exports = PartyMessage;
