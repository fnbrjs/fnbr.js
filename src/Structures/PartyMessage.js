/**
 * A party message revieved via XMPP
 */
class PartyMessage {
  constructor(client, data) {
  /**
   * @param {Object} client main client
   * @param {Object} data message data
   */
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });
    Object.defineProperty(this, 'chat', { value: this.data.chat });

    /**
     * The content of the message
     */
    this.content = data.body;

    /**
     * The party member (or clientuser) who wrote the message
     */
    this.author = data.author;
  }

  /**
   * Reply to a party message
   * @param {String} message message to reply
   */
  async reply(message) {
    return this.chat.send(message);
  }
}

module.exports = PartyMessage;
