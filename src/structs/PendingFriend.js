const User = require('./User');

/**
 * Represents a pending friend / friend request
 * @extends {User}
 */
class PendingFriend extends User {
  /**
   * @param {Client} client The main client
   * @param {Object} data The pending friend data
   */
  constructor(client, data) {
    super(client, data);

    /**
     * The direction of the friend request
     * @type {PendingFriendDirection}
     */
    this.direction = data.direction;

    /**
     * The Date when the friend request was created
     * @type {?Date}
     */
    this.createdAt = data.created ? new Date(data.created) : undefined;
  }

  /**
   * Accepts the friend request
   * @returns {Promise<Friend>}
   */
  async accept() {
    await this.client.addFriend(this.id);
    return this.client.waitForEvent(`friend#${this.id}:added`, 10000);
  }

  /**
   * Rejects this friend request
   * @returns {Promise<void>}
   */
  async reject() {
    await this.client.removeFriend(this.id);
  }

  /**
   * Aborts this friend request
   * @returns {Promise<void>}
   */
  async abort() {
    await this.client.removeFriend(this.id);
  }

  /**
   * Blocks this request's friend
   * @returns {Promise<void>}
   */
  async block() {
    await this.client.blockUser(this.id);
  }
}

module.exports = PendingFriend;
