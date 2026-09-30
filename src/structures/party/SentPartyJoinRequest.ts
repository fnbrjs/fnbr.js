import BasePartyJoinRequest from './BasePartyJoinRequest';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/** Represents a sent party join request. */
class SentPartyJoinRequest extends BasePartyJoinRequest {
  public sender!: ClientUser;
  public receiver!: Friend;
}

export default SentPartyJoinRequest;
