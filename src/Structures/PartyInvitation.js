/* eslint-disable no-restricted-syntax */
const Endpoints = require('../../resources/Endpoints');

/**
 * Represents party invitation
 */
class PartyInvitation {
  /**
   * @param {Client} client The main client
   * @param {Party} party The invitation's party
   * @param {Object} data The invitation's data
   */
  constructor(client, party, data) {
    this.Client = client;

    /**
     * The party of this invitation
     * @type {Party}
     */
    this.party = party;

    /**
     * The friend that sent this invitation
     * @type {Friend}
     */
    this.sender = this.Client.friends.get(data.sent_by);

    /**
     * The Date when the party invitation was created
     * @type {Date}
     */
    this.createdAt = new Date(data.sent_at);

    /**
     * The Date when the party invitation will expire
     * @type {Date}
     */
    this.expiresAt = new Date(data.expires_at);

    /**
     * Whether this party invitation is expired or not
     * @type {boolean}
     */
    this.expired = false;

    setTimeout(() => {
      this.expired = true;
    }, this.expiresAt.getTime() - Date.now());
  }

  /**
   * Accepts this party invitation
   * @returns {Promise<void>}
   */
  async accept() {
    if (this.expired) throw new Error(`Failed accepting party ${this.party.id} invite from ${this.sender.id}: The party invitation was already accepted/declined or it expired`);
    await this.party.join();
    this.expired = true;
    const data = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/user/${this.Client.user.id}/pings/${this.sender.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!data.success) throw new Error(`Failed accepting party ${this.party.id} invite from ${this.sender.id}: ${this.Client.parseError(data.response)}`);
  }

  /**
   * Declines this party invitation
   * @returns {Promise<void>}
   */
  async decline() {
    if (this.expired) throw new Error(`Failed declining party ${this.party.id} invite from ${this.sender.id}: The party invitation was already accepted/declined or it expired`);
    const data = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/user/${this.Client.user.id}/pings/${this.sender.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!data.success) throw new Error(`Failed declining party ${this.party.id} invite from ${this.sender.id}: ${this.Client.parseError(data.response)}`);
    this.expired = true;
  }

  /**
   * Creates an invite data object
   * @param {Client} client The main client
   * @param {string} pingerId The pinger's account id
   * @param {Object} data The invite data
   * @returns {Object}
   * @private
   */
  static createInvite(client, pingerId, data) {
    let member;
    for (const m of data.members) {
      if (m.account_id === pingerId) {
        member = m;
        break;
      }
    }
    const partyMeta = data.meta;
    const memberMeta = member.meta;
    const meta = {
      'urn:epic:conn:type_s': 'game',
      'urn:epic:cfg:build-id_s': partyMeta['urn:epic:cfg:build-id_s'],
      'urn:epic:invite:platformdata_s': '',
    };
    if (memberMeta.Platform_j) {
      meta.Platform_j = JSON.parse(memberMeta.Platform_j).Platform.platformStr;
    }
    if (memberMeta['urn:epic:member:dn_s']) meta['urn:epic:member:dn_s'] = memberMeta['urn:epic:member:dn_s'];
    return {
      party_id: data.id,
      sent_by: pingerId,
      sent_to: client.user.id,
      sent_at: data.sent,
      updated_at: data.sent,
      expires_at: data.expies_at,
      status: 'SENT',
      meta,
    };
  }
}

module.exports = PartyInvitation;
