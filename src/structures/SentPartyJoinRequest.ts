import BasePartyJoinRequest from './BasePartyJoinRequest';
import ClientUser from './ClientUser';
import Friend from './Friend';

/**
 * Represents an outgoing party join request
 */
class SentPartyJoinRequest extends BasePartyJoinRequest {
  public receiver: Friend;
  public sender: ClientUser;
}

export default SentPartyJoinRequest;
