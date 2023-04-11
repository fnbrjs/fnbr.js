import User from './User';

/**
 * Represents a blocked user
 */
class BlockedUser extends User {
  /**
   * Unblocks this user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async unblock() {
    return this.client.user.unblock(this.id);
  }
}

export default BlockedUser;
