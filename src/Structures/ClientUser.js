const User = require('./User');

/**
 * The clients user
 */
class ClientUser extends User {
  /**
   * @param {Object} client main client
   * @param {Object} data user data
   */
  constructor(client, data) {
    super(client, data);
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * First name of the client user
     */
    this.name = data.name;

    /**
     * Last name of the client user
     */
    this.lastName = data.lastName;

    /**
     * Email of the client user
     */
    this.email = data.email;

    /**
     * Number of failed login attempts of the client user
     */
    this.failedLoginAttempts = data.failedLoginAttempts;

    /**
     * The last time somebody logged into the clients account
     */
    this.lastLogin = new Date(data.lastLogin);

    /**
     * Number of the client users display name changes
     */
    this.numberOfDisplayNameChanges = data.numberOfDisplayNameChanges;

    /**
     * Age group of the client user
     */
    this.ageGroup = data.ageGroup;

    /**
     * If the account has no displayName due to `no epicgames account being linked`
     */
    this.headless = data.headless;

    /**
     * The client users country
     */
    this.country = data.country;

    /**
     * Preferred language of the client user
     */
    this.preferredLanguage = data.preferredLanguage;

    /**
     * If the client user can update its display name
     */
    this.canUpdateDisplayName = data.canUpdateDisplayName;

    /**
     * If a Two-Factor-Authentification method is enabled for the client users account
     */
    this.tfaEnabled = data.tfaEnabled;

    /**
     * If the client users email is verified (now required when creating accounts)
     */
    this.emailVerified = data.emailVerified;

    /**
     * If the account has been verified to be run by a minor
     */
    this.minorVerified = data.minorVerified;

    /**
     * If the account is expected to be run by a minor
     */
    this.minorExpected = data.minorExpected;

    /**
     * The minor status of this account.
     */
    this.minorStatus = data.minorStatus;
  }
}

module.exports = ClientUser;
