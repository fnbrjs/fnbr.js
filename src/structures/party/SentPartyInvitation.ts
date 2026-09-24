import BasePartyInvitation from './BasePartyInvitation';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/** Represents a sent EOS party invitation. */
class SentPartyInvitation extends BasePartyInvitation {
  public sender!: ClientUser;
  public receiver!: Friend;
}

export default SentPartyInvitation;
