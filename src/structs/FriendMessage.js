/**
 * Represents a friend message
 */
class FriendMessage {
  constructor(client, data) {
  /**
   * @param {Client} client The main client
   * @param {Object} data The friend message's data
   */
    Object.defineProperty(this, 'client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The content of the friend message
     * @type {string}
     */
    this.content = data.body;

    /**
     * The friend who sent the message
     * @type {Friend}
     */
    this.author = data.author || this.client.friends.cache.get(data.from.split('@')[0]);
  }

  /**
   * Replies to the friend message
   * @param {string} message The message that will be sent
   * @returns {Promise<FriendMessage>}
   */
  async reply(message) {
    if (this.author.id === this.client.user.id) throw new Error(`Failed sending a friend message to ${this.author.id}: You can't send a message to yourself`);
    return this.client.sendFriendMessage(this.author.id, message);
  }
}

module.exports = FriendMessage;
