import BasePartyJoinRequest from './BasePartyJoinRequest';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/**
 * Represents an incoming party join request
 */
class ReceivedPartyJoinRequest extends BasePartyJoinRequest {
  public receiver!: ClientUser;
  public sender!: Friend;

  /**
   * Accepts the join request. If it expired, a normal invite will be sent
   * @throws {PartyAlreadyJoinedError} The user is already a member of this party
   * @throws {PartyMaxSizeReachedError} The party reached its max size
   * @throws {EpicgamesAPIError}
   */
  public async accept() {
    return this.client.invite(this.sender.id);
  }
}

export default ReceivedPartyJoinRequest;
