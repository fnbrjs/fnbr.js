import Base from '../../Base';
import type Client from '../../Client';
import type ClientUser from '../user/ClientUser';
import type Friend from '../friend/Friend';

/**
 * Represents an incoming or outgoing party join request
 */
abstract class BasePartyJoinRequest extends Base {
  /**
   * The user who requested to join the party
   */
  public sender: Friend | ClientUser;

  /**
   * The user who received the join request
   */
  public receiver: Friend | ClientUser;

  /**
   * The creation date of the request
   */
  public createdAt: Date;

  /**
   * The expiration date of the request
   */
  public expiresAt: Date;

  /**
   * @param client The main client
   * @param sender The user who requested to join the party
   * @param receiver The user who received the join request
   * @param data The party confirmation data
   */
  constructor(client: Client, sender: Friend | ClientUser, receiver: Friend | ClientUser, data: any) {
    super(client);

    this.sender = sender;
    this.receiver = receiver;
    this.createdAt = new Date(data.sent_at);
    this.expiresAt = new Date(data.expires_at);
  }

  /**
   * Whether this join request expired
   */
  public get isExpired() {
    return Date.now() > this.expiresAt.getTime();
  }
}

export default BasePartyJoinRequest;
