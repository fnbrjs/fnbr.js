import PartyInvitationExpiredError from '../../exceptions/PartyInvitationExpiredError';
import BasePartyInvitation from './BasePartyInvitation';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/** Represents a received EOS Party v2 invitation. */
class ReceivedPartyInvitation extends BasePartyInvitation {
  public sender!: Friend;
  public receiver!: ClientUser;

  public async accept() {
    if (this.isExpired || this.isHandled || !this.eosPartyId) throw new PartyInvitationExpiredError();
    await this.client.joinParty(this.eosPartyId);
    await this.client.eosParty.deleteInvite(this.sender.id);
    this.isHandled = true;
  }

  public async decline() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();
    await this.client.eosParty.deleteInvite(this.sender.id);
    this.isHandled = true;
  }
}

export default ReceivedPartyInvitation;
