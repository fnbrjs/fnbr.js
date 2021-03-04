const BaseManager = require('./BaseManager');
const BlockedUser = require('../../structs/BlockedUser');

/**
 * Represents the blocked users manager
 * @extends {BaseManager}
 */
class BlockedUserManager extends BaseManager {
  constructor(client) {
    super(client, BlockedUser);
  }
}

module.exports = BlockedUserManager;
