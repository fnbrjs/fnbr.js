/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
const Endpoints = require('../../resources/Endpoints');
const List = require('../Util/List');
const PartyMeta = require('./PartyMeta');
const PartyMember = require('./PartyMember');
const ClientPartyMember = require('./ClientPartyMember');
const { PartyPrivacy } = require('../../enums');

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
    data.members.forEach((m) => {
      if (this.id === this.Client.account.id) this.members.set(m.account_id, new ClientPartyMember(this, m));
      else this.members.set(m.account_id, new PartyMember(this, m));
    });

    this.currentlyPatching = false;
    this.patchQueue = [];
    this.meta = new PartyMeta(this, data.meta);
    this.revision = data.revision || 0;

    if (!this.id) throw new Error('Cannot initialize party without an id');
  }

  get me() {
    return this.members.get(this.Client.account.id);
  }

  get leader() {
    return this.members.find((m) => m.isLeader);
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
   * Send a patch with the latest meta
   * @param {Object} updated updated data
   * @param {Boolean} isForced if the patch should ignore current patches
   */
  async sendPatch(updated, isForced) {
    if (!this.Client.party || !this.Client.party.me || this.id !== this.Client.party.id) {
      return;
    }
    if (!isForced && this.currentlyPatching) {
      this.patchQueue.push([updated]);
      return;
    }
    this.currentlyPatching = true;

    const patch = await this.Client.Http.send(true, 'PATCH',
      `${Endpoints.BR_PARTY}/parties/${this.Party.id}/members/${this.id}/meta`, `bearer ${this.Client.Auth.auths.token}`, null, {
        delete: [],
        revision: this.revision,
        update: updated || this.meta.schema,
      });
    if (patch.success) {
      this.revision += 1;
    } else {
      switch (patch.response.errorCode) {
        case 'errors.com.epicgames.social.party.stale_revision':
          [, this.revision] = patch.response.messageVars;
          this.patchQueue.push([updated]);
          break;
        default: return;
      }
    }

    if (this.patchQueue.length > 0) {
      const args = this.patchQueue.shift();
      this.sendPatch(...args, true);
    } else {
      this.currentlyPatching = false;
    }
    if (this.Client.config.savePartyMemberMeta) this.Client.lastMemberMeta = this.meta.schema;
  }

  update(data) {
    if (data.revision > this.revision) this.revision = data.revision;
    this.meta.update(data.party_state_updated, true);
    this.meta.remove(data.party_state_removed);

    this.config.joinability = data.party_privacy_type;
    this.config.maxSize = data.max_number_of_members;
    this.config.subType = data.party_sub_type;
    this.config.type = data.party_type;
    this.config.inviteTTL = data.invite_ttl_seconds;

    let privacy = this.meta.get('PrivacySettings_j');
    privacy = Object.values(PartyPrivacy)
      .find((val) => val.partyType === privacy.PrivacySettings.partyType
        && val.inviteRestriction === privacy.PrivacySettings.partyInviteRestriction
        && val.onlyLeaderFriendsCanJoin === privacy.PrivacySettings.bOnlyLeaderFriendsCanJoin);
    if (privacy) this.config.privacy = privacy;
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
