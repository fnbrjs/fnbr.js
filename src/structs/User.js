/* eslint-disable max-len */
/**
 * Represents a user
 */
class User {
  /**
   * @param {Client} client The main client
   * @param {Object} data The user's data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The user's name
     * @type {string}
     */
    this.displayName = data.displayName || data.member_dn;

    /**
     * The user's id
     * @type {string}
     */
    this.id = data.id || data.accountId || data.account_id;

    /**
     * The user's external auths
     * @type {Object}
     */
    this.externalAuths = data.externalAuths || {};

    /**
     * The user's linked accounts
     * @type {Object}
     */
    this.links = data.links || {};

    if (!this.id) throw new Error('Cannot initialize user without an id');

    if (!this.displayName && Object.values(this.externalAuths)[0]) {
      this.displayName = Object.values(this.externalAuths)[0].externalDisplayName;
    }
  }

  /**
   * Adds this user as a friend or accepts its friend request
   * @returns {Promise<void>}
   */
  async addFriend() {
    await this.Client.addFriend(this.id);
  }

  /**
   * Updates this user's display name, external auths and links
   * @returns {Promise<User>} This user
   */
  async fetch() {
    const fetchedUser = await this.Client.getProfile(this.id);
    this.displayName = fetchedUser.displayName;
    this.externalAuths = fetchedUser.externalAuths;
    this.links = fetchedUser.links;
    return this;
  }

  /**
   * Fetches the v2 stats for this user
   * @param {?number} startTime The timestamp to start fetching stats from; can be null/undefined for lifetime
   * @param {?number} endTime The timestamp to stop fetching stats from; can be undefined for lifetime
   * @returns {Promise<Object>} The user's stats
   */
  async fetchStats(startTime, endTime) {
    return this.Client.getBrStats(this.id, startTime, endTime);
  }
}

module.exports = User;
