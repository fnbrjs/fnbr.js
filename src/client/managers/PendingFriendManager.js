const BaseManager = require('./BaseManager');
const PendingFriend = require('../../structs/PendingFriend');

/**
 * Represents the pending friends manager
 * @extends {BaseManager}
 */
class PendingFriendManager extends BaseManager {
  constructor(client) {
    super(client, PendingFriend);
  }
}

module.exports = PendingFriendManager;
