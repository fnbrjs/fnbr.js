import Base from '../Base';
import type User from './user/User';
import type Client from '../Client';

/**
 * Represents a user's global profile.
 * Any value could be undefined if the user changed their privacy settings
 */
class GlobalProfile extends Base {
  /**
   * The user this global profile belongs to
   */
  public user: User;

  /**
   * The user's play region
   */
  public playRegion?: string;

  /**
   * The user's languages
   */
  public languages?: string[];

  /**
   * Whether the user owns the battle pass
   */
  public hasBattlePass?: boolean;

  /**
   * Whether the user has the Fortnite crew membership
   */
  public hasCrewMembership?: boolean;

  /**
   * @param client The main client
   * @param data The avatar's data
   * @param user The user this avatar belongs to
   */
  constructor(client: Client, data: any, user: User) {
    super(client);

    this.user = user;

    this.playRegion = data.playRegion;
    this.languages = data.languages;
    this.hasBattlePass = data.hasBattlePass;
    this.hasCrewMembership = data.hasCrewMembership;
  }
}

export default GlobalProfile;
