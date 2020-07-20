const User = require('./User');
const Party = require('./Party');
const Endpoints = require('../../resources/Endpoints');
const SentPartyInvitation = require('./SentPartyInvitation');

/**
 * A friend of the client
 */
class Friend extends User {
  /**
   * @param {Object} client main client
   * @param {Object} data friend data
   */
  constructor(client, data) {
    super(client, data);

    /**
     * This friends connections (psn, xbl, etc)
     */
    this.connections = data.connections || [];

    /**
     * How many mutual friends the client has with this friend
     */
    this.mutualFriends = data.mutual || 0;

    /**
     * If the client favorited this friend
     */
    this.favorite = data.favorite || false;

    /**
     * When the friendship with this friend was created
     */
    this.createdAt = data.created ? new Date(data.created) : undefined;

    /**
     * The note the client set for this friend
     */
    this.note = data.note || '';

    /**
     * The alias the client set for this friend
     */
    this.alias = data.alias || '';

    /**
     * This friends last recieved presence
     */
    this.presence = data.presence;

    /**
     * If this friend is blocked
     */
    this.isBlocked = data.blocked || false;
  }

  /**
   * Fetches if a user is online.
   * This **can be inaccurate** as it uses the recievedAt of the last presence
   */
  get isOnline() {
    if (!this.presence) return false;
    return this.presence.recievedAt.getTime() > (Date.now() - 120000);
  }

  /**
   * If the client can join this friends party.
   * This may be slighly inaccurate as it uses presence
   */
  get isJoinable() {
    if (!this.isOnline || !this.presence.partyData.id) return false;
    return !this.presence.partyData.isPrivate;
  }

  /**
   * Remove this user as a friend
   */
  async remove() {
    await this.Client.removeFriend(this.id);
  }

  /**
   * Send a message to this friend
   * @param {String} message message to send
   */
  async sendMessage(message) {
    return this.Client.sendFriendMessage(this.id, message);
  }

  /**
   * Send a party invitation to this friend
   */
  async invite() {
    if (this.Client.party.members.get(this.id)) throw new Error(`Failed sending party invitation to ${this.id}: Friend is already in the party`);
    if (this.Client.party.members.size === this.Client.party.config.maxSize) throw new Error(`Failed sending party invitation to ${this.id}: Party is full`);
    const data = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/parties/${this.Client.party.id}/invites/${this.id}?sendPing=true`, `bearer ${this.Client.Auth.auths.token}`, null, {
        'urn:epic:cfg:build-id_s': '1:1:',
        'urn:epic:conn:platform_s': this.Client.config.platform,
        'urn:epic:conn:type_s': 'game',
        'urn:epic:invite:platformdata_s': '',
        'urn:epic:member:dn_s': this.Client.user.displayName,
      });
    if (!data.success) throw new Error(`Failed sending party invitation ${this.id}: ${this.Client.parseError(data.response)}`);
    return new SentPartyInvitation(this.Client, this.Client.party, this, {
      sent_at: Date.now(),
    });
  }

  /**
   * Block this friend
   */
  async block() {
    await this.Client.blockFriend(this.id);
    this.isBlocked = true;
  }

  /**
   * Unblock this friend
   */
  async unblock() {
    await this.Client.unblockFriend(this.id);
    this.isBlocked = false;
  }

  /**
   * Join this friends party (please check if this friend isJoinable first)
   */
  async joinParty() {
    if (!this.isJoinable) throw new Error('Cannot join friend party: Party not joinable');
    const party = await Party.Lookup(this.Client, this.presence.partyData.id);
    await party.join();
  }
}

module.exports = Friend;
