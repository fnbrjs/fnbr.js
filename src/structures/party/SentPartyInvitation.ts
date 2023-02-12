import Endpoints from '../../../resources/Endpoints';
import PartyInvitationExpiredError from '../../exceptions/PartyInvitationExpiredError';
import BasePartyInvitation from './BasePartyInvitation';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/**
 * Represents a sent party invitation
 */
class SentPartyInvitation extends BasePartyInvitation {
  public sender!: ClientUser;
  public receiver!: Friend;

  /**
   * Declines this invitation
   * @throws {PartyInvitationExpiredError} The invitation already got accepted or declined
   */
  public async abort() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();

    await this.client.http.sendEpicgamesRequest(
      true,
      'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/invites/${this.receiver.id}`,
      'fortnite',
    );
    this.isHandled = true;
  }
}

export default SentPartyInvitation;
