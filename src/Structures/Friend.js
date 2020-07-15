const User = require('./User');

/**
 * A friend of the client
 */
class Friend extends User {
  /**
   * @param {Object} client main client
   * @param {Object} data friend data
   */
  constructor(client, data) {
    super(client, data);

    /**
     * This friends connections (psn, xbl, etc)
     */
    this.connections = data.connections || [];

    /**
     * How many mutual friends the client has with this friend
     */
    this.mutualFriends = data.mutual || 0;

    /**
     * If the client favorited this friend
     */
    this.favorite = data.favorite || false;

    /**
     * When the friendship with this friend was created
     */
    this.createdAt = data.created ? new Date(data.created) : undefined;

    /**
     * The note the client set for this friend
     */
    this.note = data.note || '';

    /**
     * The alias the client set for this friend
     */
    this.alias = data.alias || '';

    /**
     * This friends last recieved presence
     */
    this.presence = data.presence;
  }

  /**
   * Fetches if a user is online.
   * This **can be inaccurate** as it uses the recievedAt of the last presence
   */
  get isOnline() {
    if (!this.presence) return false;
    return this.presence.recievedAt.getTime() > (Date.now() - 120000);
  }

  /**
   * Remove this user as a friend
   */
  async removeFriend() {
    await this.Client.removeFriend(this.id);
  }

  /**
   * Send a message to this friend
   * @param {String} message message to send
   */
  async sendMessage(message) {
    return this.Client.sendFriendMessage(this.id, message);
  }
}

module.exports = Friend;
