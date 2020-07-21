/* eslint-disable no-restricted-syntax */
const Endpoints = require('../../resources/Endpoints');

/**
 * A party invitation
 */
class PartyInvitation {
  /**
   * @param {Object} client main client
   * @param {Object} party invitation party
   * @param {Object} data invitation data
   */
  constructor(client, party, data) {
    this.Client = client;
    this.party = party;
    this.sender = this.Client.friends.get(data.sent_by);
    this.createdAt = new Date(data.sent_at);
    this.expiresAt = new Date(data.expires_at);
    this.expired = false;

    setTimeout(() => {
      this.expired = true;
    }, this.expiresAt.getTime() - Date.now());
  }

  /**
   * Accepts the invitation
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
   * Declines the invitation
   */
  async decline() {
    if (this.expired) throw new Error(`Failed declining party ${this.party.id} invite from ${this.sender.id}: The party invitation was already accepted/declined or it expired`);
    const data = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/user/${this.Client.user.id}/pings/${this.sender.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!data.success) throw new Error(`Failed declining party ${this.party.id} invite from ${this.sender.id}: ${this.Client.parseError(data.response)}`);
    this.expired = true;
  }

  /**
   * Creates invite data object
   * @param {Object} client main client
   * @param {String} pingerId pinger account id
   * @param {Object} data invite data
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
