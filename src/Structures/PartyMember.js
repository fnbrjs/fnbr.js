const PartyMemberMeta = require('./PartyMemberMeta');

/**
 * Represents a party member
 */
class PartyMember {
  /**
   * @param party The member's party
   * @param data The member's data
   */
  constructor(party, data) {
    Object.defineProperty(this, 'Party', { value: party });
    Object.defineProperty(this, 'Client', { value: party.Client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The id of the party member
     * @type {string}
     */
    this.id = data.accountId || data.account_id;

    /**
     * The display name of the party member
     * @type {string}
     */
    this.displayName = this.id === this.Client.user.id
      ? this.Client.user.displayName : data.account_dn;

    /**
     * The role of the party member
     * @type {string}
     */
    this.role = data.role || '';

    /**
     * The Date when this member joined the party
     * @type {Date}
     */
    this.joinedAt = new Date(data.joined_at);

    /**
     * The meta of this party member
     * @type {PartyMemberMeta}
     */
    this.meta = new PartyMemberMeta(this, data.meta);
  }

  /**
   * The asset and id of this party member's pickaxe
   * @type {string}
   * @readonly
   */
  get pickaxe() {
    return this.meta.get('Default:AthenaCosmeticLoadout_j').AthenaCosmeticLoadout.pickaxeDef;
  }

  /**
   * The asset and id of this party member's outfit
   * @type {string}
   * @readonly
   */
  get outfit() {
    return this.meta.get('Default:AthenaCosmeticLoadout_j').AthenaCosmeticLoadout.characterDef;
  }

  /**
   * The asset and id of this party member's emote
   * @type {string}
   * @readonly
   */
  get emote() {
    return this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef;
  }

  /**
   * Whether this party member is ready or not
   * @type {boolean}
   * @readonly
   */
  get isReady() {
    return this.meta.get('Default:GameReadiness_s') === 'Ready';
  }

  /**
   * Whether this member is the leader of the party
   * @type {boolean}
   * @readonly
   */
  get isLeader() {
    return this.role === 'CAPTAIN';
  }

  /**
   * Kicks this member from the party
   * @returns {Promise<void>}
   */
  async kick() {
    if (this.id === this.Party.Client.account.id) throw new Error('Cannot kick party member: You cant kick yourself');
    return this.Party.kick(this.id);
  }

  /**
   * Promotes this member to the party leader
   * @returns {Promise<void>}
   */
  async promote() {
    if (this.id === this.Party.Client.account.id) throw new Error('Cannot promote party member: You cannot promote yourself');
    if (!this.Party.me.isLeader) throw new Error('Cannot promote party member: You aren\'t the party leader');
    return this.Party.promote(this.id);
  }

  /**
   * Updates the party member's meta
   * @param {Object} data The updated meta
   * @returns {void}
   * @private
   */
  update(data) {
    if (data.revision > this.revision) this.revision = data.revision;
    if (data.account_dn !== this.displayName) this.displayName = data.account_dn;
    this.meta.update(data.member_state_updated, true);
    this.meta.remove(data.member_state_removed);
  }
}

module.exports = PartyMember;
