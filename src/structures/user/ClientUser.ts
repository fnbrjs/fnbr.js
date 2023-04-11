import User from './User';
import type { ClientUserData } from '../../../resources/structs';
import type Client from '../../Client';

/**
 * Represents the user of a client
 */
class ClientUser extends User {
  /**
   * The first name of the client's Epic Games account
   */
  public name: string;

  /**
   * The last name of the client's Epic Games account
   */
  public lastName: string;

  /**
   * The email of the client's Epic Games account
   */
  public email: string;

  /**
   * The number of failed login attempts of the client's Epic Games account
   */
  public failedLoginAttempts: number;

  /**
   * The last time somebody logged in on the client's Epic Games account
   */
  public lastLogin: Date;

  /**
   * The number of display name changes of the client's Epic Games account
   */
  public numberOfDisplayNameChanges: number;

  /**
   * The age group of the client's Epic Games account
   */
  public ageGroup: string;

  /**
   * Whether the account has no display name due to no epicgames account being linked
   */
  public headless: boolean;

  /**
   * The country of the client's Epic Games account
   */
  public country: string;

  /**
   * The preferred language of the client's Epic Games account
   */
  public preferredLanguage: string;

  /**
     * Whether the client's Epic Games account can update its display name
     */
  public canUpdateDisplayName: boolean;

  /**
   * Whether a Two-Factor-Authentification method is enabled
   */
  public tfaEnabled: boolean;

  /**
   * Whether the email is verified (now required when creating accounts)
   */
  public emailVerified: boolean;

  /**
   * Whether the account has been verified to be run by a minor
   */
  public minorVerified: boolean;

  /**
   * Whether the account is expected to be run by a minor
   */
  public minorExpected: boolean;

  /**
   * The minor status of the client's Epic Games account
   */
  public minorStatus: string;

  /**
   * @param client The main client
   * @param data The user's data
   */
  constructor(client: Client, data: ClientUserData) {
    super(client, data);

    this.name = data.name;
    this.lastName = data.lastName;
    this.email = data.email;
    this.failedLoginAttempts = data.failedLoginAttempts;
    this.lastLogin = new Date(data.lastLogin);
    this.numberOfDisplayNameChanges = data.numberOfDisplayNameChanges;
    this.ageGroup = data.ageGroup;
    this.headless = data.headless;
    this.country = data.country;
    this.preferredLanguage = data.preferredLanguage;
    this.canUpdateDisplayName = data.canUpdateDisplayName;
    this.tfaEnabled = data.tfaEnabled;
    this.emailVerified = data.emailVerified;
    this.minorVerified = data.minorVerified;
    this.minorExpected = data.minorExpected;
    this.minorStatus = data.minorStatus;
  }
}

export default ClientUser;
