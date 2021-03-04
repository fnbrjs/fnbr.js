const BaseManager = require('./BaseManager');
const Friend = require('../../structs/Friend');
const PendingFriendManager = require('./PendingFriendManager');
const BlockedUserManager = require('./BlockedUserManager');

/**
 * Represents the friend manager
 * @extends {BaseManager}
 */
class FriendManager extends BaseManager {
  constructor(client) {
    super(client, Friend);

    /**
     * The pending friends manager
     * @type {PendingFriendManager}
     */
    this.pending = new PendingFriendManager(this.client);

    /**
     * The blocked users manager
     * @type {BlockedUserManager}
     */
    this.blocked = new BlockedUserManager(this.client);
  }
}

module.exports = FriendManager;
