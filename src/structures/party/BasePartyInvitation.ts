import Base from '../../Base';
import type Client from '../../Client';
import type ClientParty from './ClientParty';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';
import type Party from './Party';

/**
 * Represents a party invitation (either incoming or outgoing)
 */
abstract class BasePartyInvitation extends Base {
  /**
   * The party this invitation belongs to
   */
  public party: Party | ClientParty;

  /**
   * The party this invitation belongs to
   */
  public sender: Friend | ClientUser;

  /**
   * The creation date of this invitation
   */
  public createdAt: Date;

  /**
   * The expiration date of this invitation
   */
  public expiresAt: Date;

  /**
   * Whether this invitation got accepted / declined / aborted
   */
  public isHandled: boolean;

  /**
   * The friend (or the client user) who received this invitation
   */
  public receiver: Friend | ClientUser;

  /**
   * @param client The main client
   * @param party The party this invitation belongs to
   * @param sender The friend (or the client user) who sent this invitation
   * @param receiver The friend (or the client user) who received this invitation
   * @param data The invitation data
   */
  constructor(client: Client, party: Party | ClientParty, sender: Friend | ClientUser, receiver: Friend | ClientUser, data: any) {
    super(client);

    this.party = party;

    this.sender = sender;
    this.receiver = receiver;
    this.createdAt = new Date(data.sent_at);
    this.expiresAt = new Date(data.expires_at);
    this.isHandled = false;
  }

  /**
   * Whether this invitation expired
   */
  public get isExpired() {
    return Date.now() > this.expiresAt.getTime();
  }
}

export default BasePartyInvitation;
