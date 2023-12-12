import Endpoints from '../../../resources/Endpoints';
import PartyInvitationExpiredError from '../../exceptions/PartyInvitationExpiredError';
import BasePartyInvitation from './BasePartyInvitation';
import { AuthSessionStoreKey } from '../../../resources/enums';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/**
 * Represents a recieved party invitation
 */
class ReceivedPartyInvitation extends BasePartyInvitation {
  public sender!: Friend;
  public receiver!: ClientUser;

  /**
   * Accepts this invitation
   * @throws {PartyInvitationExpiredError} The invitation already got accepted or declined
   * @throws {EpicgamesAPIError}
   */
  public async accept() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();

    await this.party.join();
    this.isHandled = true;

    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.BR_PARTY}/user/${this.client.user.self!.id}/pings/${this.sender.id}`,
    }, AuthSessionStoreKey.Fortnite);
  }

  /**
   * Declines this invitation
   * @throws {PartyInvitationExpiredError} The invitation already got accepted or declined
   */
  public async decline() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();

    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.BR_PARTY}/user/${this.client.user.self!.id}/pings/${this.sender.id}`,
    }, AuthSessionStoreKey.Fortnite);

    this.isHandled = true;
  }
}

export default ReceivedPartyInvitation;
