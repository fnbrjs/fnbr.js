const PartyMemberMeta = require('./PartyMemberMeta');

class PartyMember {
  constructor(party, data) {
    Object.defineProperty(this, 'Party', { value: party });
    Object.defineProperty(this, 'Client', { value: party.Client });
    Object.defineProperty(this, 'data', { value: data });

    this.id = data.accountId || data.account_id;
    this.displayName = data.account_dn;
    this.role = data.role || '';
    this.joinedAt = new Date(data.joined_at);
    this.meta = new PartyMemberMeta(this, data.meta);
  }

  /**
   * The asset and id of this members pickaxe
   */
  get pickaxe() {
    return this.meta.get('Default:AthenaCosmeticLoadout_j').AthenaCosmeticLoadout.pickaxeDef;
  }

  /**
   * The asset and id of this members outfit
   */
  get outfit() {
    return this.meta.get('Default:AthenaCosmeticLoadout_j').AthenaCosmeticLoadout.characterDef;
  }

  /**
   * The asset and id of this members emote
   */
  get emote() {
    return this.meta.get('Default:FrontendEmote_j').FrontendEmote.emoteItemDef;
  }

  /**
   * If this member is ready
   */
  get isReady() {
    return this.meta.get('Default:GameReadiness_s') === 'Ready';
  }

  /**
   * If this member is leader of the party
   */
  get isLeader() {
    return this.role === 'CAPTAIN';
  }

  /**
   * Kick this member from the party
   */
  async kick() {
    if (this.id === this.Party.Client.account.id) throw new Error('Cannot kick party member: You cant kick yourself');
    return this.Party.kick(this.id);
  }

  /**
   * Promote this member to the party leader
   */
  async promote() {
    if (this.id === this.Party.Client.account.id) throw new Error('Cannot promote party member: You cannot promote yourself');
    if (!this.Party.me.isLeader) throw new Error('Cannot promote party member: You aren\'t the party leader');
    return this.Party.promote(this.id);
  }

  /**
   * This method is used to refresh this member via xmpp
   * @param {Object} data xmpp data
   */
  update(data) {
    if (data.revision > this.revision) this.revision = data.revision;
    if (data.account_dn !== this.displayName) this.displayName = data.account_dn;
    this.meta.update(data.member_state_updated, true);
    this.meta.remove(data.member_state_removed);
  }
}

module.exports = PartyMember;
