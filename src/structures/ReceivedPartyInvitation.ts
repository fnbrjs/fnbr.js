import Endpoints from '../../resources/Endpoints';
import PartyInvitationExpiredError from '../exceptions/PartyInvitationExpiredError';
import BasePartyInvitation from './BasePartyInvitation';
import ClientUser from './ClientUser';
import Friend from './Friend';

/**
 * Represents a recieved party invitation
 */
class ReceivedPartyInvitation extends BasePartyInvitation {
  public sender: Friend;
  public receiver: ClientUser;

  /**
   * Accepts this invitation
   * @throws {PartyInvitationExpiredError} The invitation already got accepted or declined
   * @throws {EpicgamesAPIError}
   */
  public async accept() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();

    await this.party.join();
    this.isHandled = true;
    await this.client.http.sendEpicgamesRequest(true, 'DELETE',
      `${Endpoints.BR_PARTY}/user/${this.client.user?.id}/pings/${this.sender.id}`, 'fortnite');
  }

  /**
   * Declines this invitation
   * @throws {PartyInvitationExpiredError} The invitation already got accepted or declined
   */
  public async decline() {
    if (this.isExpired || this.isHandled) throw new PartyInvitationExpiredError();

    await this.client.http.sendEpicgamesRequest(true, 'DELETE',
      `${Endpoints.BR_PARTY}/user/${this.client.user?.id}/pings/${this.sender.id}`, 'fortnite');
    this.isHandled = true;
  }
}

export default ReceivedPartyInvitation;
