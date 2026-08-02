import Base from '../../Base';
import PartyPermissionError from '../../exceptions/PartyPermissionError';
import type { PresencePartyData } from '../../../resources/structs';
import type Client from '../../Client';
import type Party from './Party';

/**
 * Represents a party received by a friend's presence
 */
class PresenceParty extends Base {
  /**
   * Whether this party is private.
   * NOTE: If this is true, all other properties are undefined
   */
  public isPrivate: boolean;

  /**
   * The party's ID
   */
  public id?: string;

  /**
   * The party's member count
   */
  public size?: number;

  /**
   * The party type ID
   * @deprecated This property is no longer used and will be removed in a future version
   */
  public typeId?: number;

  /**
   * The party key
   * @deprecated This property is no longer used and will be removed in a future version
   */
  public key?: string;

  /**
   * The party's app ID
   */
  public appId?: string;

  /**
   * The party's build ID
   */
  public buildId?: string;

  /**
   * The party's flags
   */
  public flags?: number;

  /**
   * The reason why this party doesn't accept new members.
   * Will be 0 if it does accept new members
   */
  public notAcceptingMembersReason?: number;

  /**
   * @param client The main client
   * @param data The presence party's data
   */
  constructor(client: Client, data: PresencePartyData) {
    super(client);

    this.isPrivate = typeof data.bIsPrivate === 'boolean' && data.bIsPrivate;
    this.id = data.p;
    this.size = data.pc;
    this.appId = data.d;
    this.buildId = data.b;
    this.flags = data.f;
    this.notAcceptingMembersReason = data.nAR;
  }

  /**
   * Joins this presence party
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched (the party is private)
   * @throws {PartyMaxSizeReachedError} The party has reached its max size
   */
  public async join() {
    if (this.isPrivate || !this.id) throw new PartyPermissionError();

    await this.client.joinParty(this.id);
  }

  /**
   * Fetches this party
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched (the party is private)
   */
  public async fetch() {
    if (this.isPrivate || !this.id) throw new PartyPermissionError();

    return this.client.getParty(this.id) as Promise<Party>;
  }
}

export default PresenceParty;
