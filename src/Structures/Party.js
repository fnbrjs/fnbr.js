/* eslint-disable no-param-reassign */
const Endpoints = require('../../resources/Endpoints');
const List = require('../Util/List');

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
    this.config = data.config;
    this.members = new List();
    data.members.forEach((m) => this.members.set(m.account_id, m));
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

  async leave(createNew = true) {
    const party = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.Client.account.id}`, `bearer ${this.Client.Auth.auths.token}`, null, {
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
          'urn:epic:member:type_s': 'game',
          'urn:epic:member:platform_s': this.Client.config.platform,
          'urn:epic:member:joinrequest_j': '{"CrossplayPreference_i":"1"}',
        },
      });
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

    const clientParty = new Party(client, party.response);
    clientParty.config = { ...partyConfig, ...party.response.config || {} };

    client.party = clientParty;
    return clientParty;
  }
}

module.exports = Party;
