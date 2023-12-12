import BasePendingFriend from './BasePendingFriend';
import type { PendingFriendData } from '../../../resources/structs';
import type Client from '../../Client';

/**
 * Represents an outgoing pending friendship request
 */
class OutgoingPendingFriend extends BasePendingFriend {
  constructor(client: Client, data: PendingFriendData) {
    super(client, data);

    this.direction = 'OUTGOING';
  }

  /**
   * Cancels this outgoing pending friend request
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {FriendNotFoundError} The user is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async abort() {
    return this.client.friend.remove(this.id);
  }
}

export default OutgoingPendingFriend;
