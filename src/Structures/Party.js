/* eslint-disable no-param-reassign */
const Endpoints = require('../../resources/Endpoints');
const List = require('../Util/List');
const PartyMeta = require('./PartyMeta');

/**
 * A party
 */
class Party {
  /**
   * @param {Object} client main client
   * @param {Object} data party data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    this.id = data.id;
    this.createdAt = new Date(data.created_at);
    this.config = this.Client.makeCamelCase(data.config);
    this.members = new List();
    data.members.forEach((m) => this.members.set(m.account_id, m));

    this.meta = new PartyMeta(this, data.meta);
    this.revision = data.revision;

    if (!this.id) throw new Error('Cannot initialize party without an id');
  }

  async join() {
    if (this.Client.party) await this.Client.party.leave();
    const party = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.Client.account.id}/join`, `bearer ${this.Client.Auth.auths.token}`, null, {
        connection: {
          id: this.Client.Xmpp.stream.jid,
          meta: {
            'urn:epic:conn:platform_s': this.Client.config.platform,
            'urn:epic:conn:type_s': 'game',
          },
          yield_leadership: false,
        },
        meta: {
          'urn:epic:member:dn_s': this.Client.account.displayName,
          'urn:epic:member:joinrequestusers_j': JSON.stringify({
            users: [
              {
                id: this.Client.account.id,
                dn: this.Client.account.displayName,
                plat: this.Client.config.short,
                data: JSON.stringify({
                  CrossplayPreference: '1',
                  SubGame_u: '1',
                }),
              },
            ],
          }),
        },
      });
    if (!party.success) throw new Error(`Failed joining party: ${this.Client.parseError(party.response)}`);
    this.Client.party = this;
  }

  patchPresence() {
    const partyJoinInfoData = this.config.privacy.presencePermission === 'None'
      || (this.Client.party.config.privacy.presencePermission === 'Leader' && this.leader.id === this.Client.account.id)
      ? {
        bIsPrivate: true,
      } : {
        sourceId: this.Client.account.id,
        sourceDisplayName: this.Client.account.displayName,
        sourcePlatform: this.Client.config.platform,
        partyId: this.id,
        partyTypeId: 286331153,
        key: 'k',
        appId: 'Fortnite',
        buildId: '1:1:',
        partyFlags: -2024557306,
        notAcceptingReason: 0,
        pc: this.members.size,
      };
    const properties = {
      'party.joininfodata.286331153_j': partyJoinInfoData,
      FortBasicInfo_j: {
        homeBaseRating: 1,
      },
      FortLFG_I: '0',
      FortPartySize_i: 1,
      FortSubGame_i: 1,
      InUnjoinableMatch_b: false,
      FortGameplayStats_j: {
        state: '',
        playlist: 'None',
        numKills: 0,
        bFellToDeath: false,
      },
    };
    const presence = {
      Status: '',
      bIsPlaying: true,
      bIsJoinable: false,
      bHasVoiceSupport: false,
      SessionId: '',
      Properties: properties,
    };
    this.Client.Xmpp.sendStatus(presence);
  }

  async leave(createNew = true) {
    const party = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.Client.account.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!party.success) throw new Error(`Failed leaving party: ${this.Client.parseError(party.response)}`);
    this.Client.party = undefined;

    if (createNew) await Party.Create(this.Client);
  }

  /**
   * Lookup which parties the client user is in / got invited to
   * @param {Object} client the main client
   */
  static async LookupSelf(client) {
    const party = await client.Http.send(true, 'GET', `${Endpoints.BR_PARTY}/user/${client.account.id}`, `bearer ${client.Auth.auths.token}`);
    if (!party.success) throw new Error(`Failed looking up clientparty: ${client.parseError(party.response)}`);
    if (!party.response.current[0]) return undefined;
    return new Party(client, party.response.current[0]);
  }

  /**
   * Create a party
   * @param {Object} client the main client
   */
  static async Create(client, config) {
    const partyConfig = { ...client.config.partyConfig, ...config };
    const party = await client.Http.send(true, 'POST', `${Endpoints.BR_PARTY}/parties`, `bearer ${client.Auth.auths.token}`, null, {
      config: {
        join_confirmation: partyConfig.joinConfirmation,
        joinability: partyConfig.joinability,
        max_size: partyConfig.maxSize,
      },
      join_info: {
        connection: {
          id: client.Xmpp.stream.jid,
          meta: {
            'urn:epic:conn:platform_s': client.config.platform,
            'urn:epic:conn:type_s': 'game',
          },
          yield_leadership: false,
        },
        meta: {
          'urn:epic:member:dn_s': client.account.displayName,
        },
      },
      meta: {
        'urn:epic:cfg:party-type-id_s': 'default',
        'urn:epic:cfg:build-id_s': '1:1:',
        'urn:epic:cfg:join-request-action_s': 'Manual',
        'urn:epic:cfg:chat-enabled_b': partyConfig.chatEnabled.toString(),
      },
    });

    if (!party.success) throw new Error(`Failed creating party: ${client.parseError(party.response)}`);

    party.response.config = { ...partyConfig, ...party.response.config || {} };
    const clientParty = new Party(client, party.response);

    client.party = clientParty;
    return clientParty;
  }
}

module.exports = Party;
