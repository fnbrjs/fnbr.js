class User {
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The users name
     */
    this.displayName = data.displayName || data.member_dn;

    /**
     * The users id
     */
    this.id = data.id || data.accountId || data.account_id;

    /**
     * The users external auths
     */
    this.externalAuths = data.externalAuths || {};

    /**
     * The users linked accounts
     */
    this.links = data.links || {};

    if (!this.id) throw new Error('Cannot initialize user without an id');
  }

  /**
   * Add this user as a friend or accept this users friend request
   */
  async addFriend() {
    await this.Client.addFriend(this.id);
  }

  /**
   * Update this users displayName, externalAuths and links
   */
  async fetch() {
    const fetchedUser = await this.Client.getProfile(this.id);
    this.displayName = fetchedUser.displayName;
    this.externalAuths = fetchedUser.externalAuths;
    this.links = fetchedUser.links;
    return this;
  }

  /**
   * Fetch v2 stats for this user
   * @param {Number?} startTime epoch to start fetching stats (empty for lifetime)
   * @param {Number?} endTime epoch to stop fetching stats (empty for lifetime)
   * @returns {Promise<Object>} player stats
   */
  async fetchStats(startTime, endTime) {
    return this.Client.getBrStats(this.id, startTime, endTime);
  }
}

module.exports = User;
