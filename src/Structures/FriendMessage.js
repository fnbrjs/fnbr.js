/**
 * A friend message revieved via XMPP
 */
class FriendMessage {
  constructor(client, data) {
  /**
   * @param {Object} client main client
   * @param {Object} data message data
   */
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The content of the message
     */
    this.content = data.body;

    /**
     * The friend (or clientuser) who wrote the message
     */
    this.author = data.author || this.Client.friends.get(data.from.split('@')[0]);
  }

  /**
   * Reply to a friend message
   * @param {String} message message to reply
   */
  async reply(message) {
    if (this.author.id === this.Client.user.id) throw new Error(`Failed sending a friend message to ${this.author.id}: You can't message yourself`);
    return this.Client.sendFriendMessage(this.author.id, message);
  }
}

module.exports = FriendMessage;
