import Client from '../client/Client';
import Base from '../client/Base';
import { STWProfileData, STWProfileItemWithId, STWProfileStats } from '../../resources/httpResponses';

/**
 * Represents a Save The World profile
 */
class STWProfile extends Base {
  /**
   * The profile ID.
   * NOTE: THIS IS NOT THE ACCOUNT ID
   */
  public id: string;

  /**
   * The profile's creation date
   */
  public createdAt: Date;

  /**
   * The profile's last updated date
   */
  public updatedAt: Date;

  /**
   * The profile's revision
   */
  public revision: number;

  /**
   * The profile's wipe number
   */
  public wipeNumber: number;

  /**
   * The ID of the account this profile belongs to
   */
  public accountId: string;

  /**
   * The profile version
   */
  public version: string;

  /**
   * The profile's command revision
   */
  public commandRevision: number;

  /**
   * The profile's items
   */
  public items: STWProfileItemWithId[];

  /**
   * The profile's stats
   */
  public stats: STWProfileStats;

  /**
   * @param client The main client
   * @param data The profile data
   */
  constructor(client: Client, data: STWProfileData) {
    super(client);

    this.id = data._id;
    this.createdAt = new Date(data.created);
    this.updatedAt = new Date(data.updated);
    this.revision = data.rvn;
    this.wipeNumber = data.wipeNumber;
    this.accountId = data.accountId;
    this.version = data.version;
    this.commandRevision = data.commandRevision;

    this.items = Object.keys(data.items).map((k) => ({ id: k, ...data.items[k] }));
    this.stats = data.stats.attributes;
  }
}

export default STWProfile;
