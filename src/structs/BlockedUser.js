const User = require('./User');

/**
 * Represents a blocked user
 * @extends {User}
 */
class BlockedUser extends User {
  /**
   * Unblocks the user
   * @returns {Promise<void>}
   */
  async unblock() {
    await this.client.unblockUser(this.id);
  }
}

module.exports = BlockedUser;
