const User = require('./User');

/**
 * Represents the user of a client
 */
class ClientUser extends User {
  /**
   * @param {Client} client The main client
   * @param {Object} data The user's data
   */
  constructor(client, data) {
    super(client, data);
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The first name of the client's Epic Games account
     * @type {string}
     */
    this.name = data.name;

    /**
     * The last name of the client's Epic Games account
     * @type {string}
     */
    this.lastName = data.lastName;

    /**
     * The email of the client's Epic Games account
     * @type {string}
     */
    this.email = data.email;

    /**
     * The number of failed login attempts of the client's Epic Games account
     * @type {number}
     */
    this.failedLoginAttempts = data.failedLoginAttempts;

    /**
     * The last time somebody logged in on the client's Epic Games account
     * @type {Date}
     */
    this.lastLogin = new Date(data.lastLogin);

    /**
     * The number of display name changes of the client's Epic Games account
     * @type {number}
     */
    this.numberOfDisplayNameChanges = data.numberOfDisplayNameChanges;

    /**
     * The age group of the client's Epic Games account
     * @type {string}
     */
    this.ageGroup = data.ageGroup;

    /**
     * Whether the account has no display name due to no epicgames account being linked
     * @type {boolean}
     */
    this.headless = data.headless;

    /**
     * The country of the client's Epic Games account
     * @type {boolean}
     */
    this.country = data.country;

    /**
     * The preferred language of the client's Epic Games account
     * @type {string}
     */
    this.preferredLanguage = data.preferredLanguage;

    /**
     * Whether the client's Epic Games account can update its display name
     * @type {boolean}
     */
    this.canUpdateDisplayName = data.canUpdateDisplayName;

    /**
     * Whether a Two-Factor-Authentification method is enabled
     * @type {boolean}
     */
    this.tfaEnabled = data.tfaEnabled;

    /**
     * Whether the email is verified (now required when creating accounts)
     * @type {boolean}
     */
    this.emailVerified = data.emailVerified;

    /**
     * Whether the account has been verified to be run by a minor
     * @type {boolean}
     */
    this.minorVerified = data.minorVerified;

    /**
     * Whether the account is expected to be run by a minor
     * @type {boolean}
     */
    this.minorExpected = data.minorExpected;

    /**
     * The minor status of the client's Epic Games account
     * @type {string}
     */
    this.minorStatus = data.minorStatus;
  }
}

module.exports = ClientUser;
