const User = require('./User');

/**
 * A pending friend
 */
class PendingFriend extends User {
  /**
   * @param {Object} client main client
   * @param {Object} data pending friend data
   */
  constructor(client, data) {
    super(client, data);

    /**
     * Direction of the friend request (INCOMING or OUTGOING)
     */
    this.direction = data.direction;

    /**
     * When the friend request was created
     */
    this.createdAt = data.created ? new Date(data.created) : undefined;
  }

  /**
   * Accept this request if incoming
   */
  async accept() {
    await this.Client.addFriend(this.id);
    return this.Client.waitForEvent(`friend#${this.id}:added`, 10000);
  }

  /**
   * Decline/Abort this request
   */
  async decline() {
    await this.Client.removeFriend(this.id);
  }

  /**
   * Block this request
   */
  async block() {
    await this.Client.blockFriend(this.id);
  }
}

module.exports = PendingFriend;
