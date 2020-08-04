/* eslint-disable no-return-await */
/* eslint-disable max-len */
/* eslint-disable no-param-reassign */
const Endpoints = require('../../resources/Endpoints');
const List = require('../Util/List');
const PartyMeta = require('./PartyMeta');
const PartyMember = require('./PartyMember');
const ClientPartyMember = require('./ClientPartyMember');
const { PartyPrivacy } = require('../../enums');
const PartyChat = require('./PartyChat');
const SentPartyInvitation = require('./SentPartyInvitation');

/**
 * Represents a party
 */
class Party {
  /**
   * @param {Client} client The main client
   * @param {Object} data The party's data
   */
  constructor(client, data) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * The id of this party
     * @type {string}
     */
    this.id = data.id;

    /**
     * The date when this party was created
     * @type {Date}
     */
    this.createdAt = new Date(data.created_at);

    /**
     * The config of this party
     * @type {ClientOptions.partyConfig}
     */
    this.config = { ...this.Client.config.partyConfig, ...this.Client.makeCamelCase(data.config) };

    /**
     * The members of this party
     * @type {List}
     */
    this.members = new List();
    data.members.forEach((m) => {
      if (m.account_id === this.Client.user.id) this.members.set(m.account_id, new ClientPartyMember(this, m));
      else this.members.set(m.account_id, new PartyMember(this, m));
    });

    /**
     * Whether the party is currently sending a patch
     * @type {boolean}
     */
    this.currentlyPatching = false;

    /**
     * The patches queue
     * @type {Array}
     */
    this.patchQueue = [];

    /**
     * The meta of this party
     * @type {PartyMeta}
     */
    this.meta = new PartyMeta(this, data.meta);

    /**
     * The chat room of this party
     * @type {PartyChat}
     */
    this.chat = new PartyChat(this);

    /**
     * The revision of this party
     * @type {number}
     */
    this.revision = data.revision || 0;

    /**
     * If squad assignments should be auto patched
     * @type {boolean}
     */
    this.patchAssignmentsLocked = false;

    if (!this.id) throw new Error('Cannot initialize party without an id');
  }

  /**
   * The client's party member
   * @type {ClientPartyMember}
   * @readonly
   */
  get me() {
    return this.members.get(this.Client.user.id);
  }

  /**
   * The leader of this party
   * @type {PartyMember}
   * @readonly
   */
  get leader() {
    return this.members.find((m) => m.isLeader);
  }

  /**
   * Joins this party
   * @returns {Promise<void>}
   */
  async join() {
    this.Client.partyLock.active = true;
    if (this.Client.party) await this.Client.party.leave(false);
    const party = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.Client.user.id}/join`, `bearer ${this.Client.Auth.auths.token}`, null, {
        connection: {
          id: this.Client.Xmpp.stream.jid,
          meta: {
            'urn:epic:conn:platform_s': this.Client.config.platform,
            'urn:epic:conn:type_s': 'game',
          },
          yield_leadership: false,
        },
        meta: {
          'urn:epic:member:dn_s': this.Client.user.displayName,
          'urn:epic:member:joinrequestusers_j': JSON.stringify({
            users: [
              {
                id: this.Client.user.id,
                dn: this.Client.user.displayName,
                plat: this.Client.config.platform,
                data: JSON.stringify({
                  CrossplayPreference: '1',
                  SubGame_u: '1',
                }),
              },
            ],
          }),
        },
      });
    if (!party.success) {
      this.Client.partyLock.active = false;
      if (party.response.errorCode === 'errors.com.epicgames.social.party.user_has_party') {
        await this.Client.initParty(false);
        await this.join();
      } else {
        await this.Client.initParty();
        throw new Error(`Failed joining party: ${this.Client.parseError(party.response)}`);
      }
    }

    await this.chat.join();
    this.Client.party = this;
    this.Client.partyLock.active = false;
  }

  /**
   * Sends an updated presence
   * @returns {Promise<void>}
   * @private
   */
  patchPresence() {
    const partyJoinInfoData = this.config.privacy.presencePermission === 'None'
      || (this.Client.party.config.privacy.presencePermission === 'Leader' && this.leader.id === this.Client.user.id)
      ? {
        bIsPrivate: true,
      } : {
        sourceId: this.Client.user.id,
        sourceDisplayName: this.Client.user.displayName,
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
      KairosProfile_j: {
        appInstalled: 'init',
        avatar: this.Client.config.kairos.cid.toLowerCase(),
        avatarBackground: this.Client.config.kairos.color.replace(/ /g, ''),
      },
    };
    const presence = {
      Status: this.Client.config.status || `Battle Royale Lobby - ${this.members.size} / ${this.config.maxSize}`,
      bIsPlaying: true,
      bIsJoinable: false,
      bHasVoiceSupport: false,
      SessionId: '',
      Properties: properties,
    };
    this.Client.Xmpp.sendStatus(presence);
  }

  /**
   * Sends a message to the chat of this party
   * @param {string} message The message that will be sent
   * @returns {Promise<PartyMessage>}
   */
  async sendMessage(message) {
    return await this.chat.send(message);
  }

  /**
   * Sends a party invitation to a friend
   * @param {string} friend The friend's id or display name
   * @returns {Promise<SentPartyInvitation>}
   */
  async invite(friend) {
    const cachedFriend = this.Client.friends.find((f) => f.id === friend || f.displayName === friend);
    if (!cachedFriend) throw new Error(`Failed sending party invitation to ${friend}: Friend not existing`);
    if (this.members.has(cachedFriend.id)) throw new Error(`Failed sending party invitation to ${friend}: Friend is already in the party`);
    if (this.members.size === this.config.maxSize) throw new Error(`Failed sending party invitation to ${friend}: Party is full`);
    const data = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/parties/${this.id}/invites/${cachedFriend.id}?sendPing=true`, `bearer ${this.Client.Auth.auths.token}`, null, {
        'urn:epic:cfg:build-id_s': '1:1:',
        'urn:epic:conn:platform_s': this.Client.config.platform,
        'urn:epic:conn:type_s': 'game',
        'urn:epic:invite:platformdata_s': '',
        'urn:epic:member:dn_s': this.Client.user.displayName,
      });
    if (!data.success) throw new Error(`Failed sending party invitation to ${friend}: ${this.Client.parseError(data.response)}`);
    return new SentPartyInvitation(this.Client, this, cachedFriend, {
      sent_at: Date.now(),
    });
  }

  /**
   * Leaves this party
   * @param {boolean} createNew Whether a new party should be created or not
   * @returns {Promise<void>}
   */
  async leave(createNew = true) {
    this.Client.partyLock.active = true;
    this.chat.leave();
    this.patchQueue = [];
    if (this.me) this.me.patchQueue = [];
    const party = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.Client.user.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!party.success) {
      if (party.response.errorCode === 'errors.com.epicgames.social.party.party_not_found') {
        this.Client.partyLock.active = false;
        this.Client.initParty();
      } else throw new Error(`Failed leaving party: ${this.Client.parseError(party.response)}`);
    }
    this.Client.party = undefined;
    this.Client.partyLock.active = false;

    if (createNew) await Party.Create(this.Client);
  }

  /**
   * Sends a patch with the latest meta
   * @param {Object} updated The updated data
   * @param {Array} deleted The deleted data
   * @param {boolean} isForced Whether the patch should ignore current patches
   * @returns {Promise<void>}
   * @private
   */
  async sendPatch(updated, deleted, isForced) {
    if (!isForced && this.currentlyPatching) {
      this.patchQueue.push([updated]);
      return;
    }
    this.currentlyPatching = true;

    const patch = await this.Client.Http.send(true, 'PATCH',
      `${Endpoints.BR_PARTY}/parties/${this.id}`, `bearer ${this.Client.Auth.auths.token}`, null, {
        config: {
          join_confirmation: this.config.joinConfirmation,
          joinability: this.config.joinability,
          max_size: this.config.maxSize,
        },
        meta: {
          delete: deleted || [],
          update: updated || this.meta.schema,
        },
        party_state_overridden: {},
        party_privacy_type: this.config.joinability,
        party_type: this.config.type,
        party_sub_type: this.config.subType,
        max_number_of_members: this.config.maxSize,
        invite_ttl_seconds: this.config.inviteTTL,
        revision: this.revision,
      });
    if (patch.success) {
      this.revision += 1;
    } else {
      switch (patch.response.errorCode) {
        case 'errors.com.epicgames.social.party.stale_revision':
          [, this.revision] = patch.response.messageVars;
          this.patchQueue.push([updated]);
          break;
        case 'errors.com.epicgames.social.party.party_change_forbidden':
          if (this.patchQueue.length > 0) {
            const args = this.patchQueue.shift();
            this.sendPatch(...args, true);
          } else {
            this.currentlyPatching = false;
          }
          throw new Error('Cannot patch party as client isnt party leader');
        default: break;
      }
    }

    if (this.patchQueue.length > 0) {
      const args = this.patchQueue.shift();
      this.sendPatch(...args, true);
    } else {
      this.currentlyPatching = false;
    }
  }

  /**
   * Updates the party's meta
   * @param {Object} data The updated data
   * @returns {void}
   * @private
   */
  update(data) {
    if (data.revision > this.revision) this.revision = data.revision;
    this.meta.update(data.party_state_updated, true);
    this.meta.remove(data.party_state_removed);

    this.config.joinability = data.party_privacy_type;
    this.config.maxSize = data.max_number_of_members;
    this.config.subType = data.party_sub_type;
    this.config.type = data.party_type;
    this.config.inviteTTL = data.invite_ttl_seconds;

    let privacy = this.meta.get('Default:PrivacySettings_j');
    privacy = Object.values(PartyPrivacy)
      .find((val) => val.partyType === privacy.PrivacySettings.partyType
        && val.inviteRestriction === privacy.PrivacySettings.partyInviteRestriction
        && val.onlyLeaderFriendsCanJoin === privacy.PrivacySettings.bOnlyLeaderFriendsCanJoin);
    if (privacy) this.config.privacy = privacy;
  }

  /**
   * Sets this party's privacy
   * @param {PartyPrivacy} privacy The new privacy
   * @returns {Promise<void>}
   */
  async setPrivacy(privacy) {
    if (!Object.values(PartyPrivacy).includes(privacy)) {
      throw new Error(`Cannot change party privacy: ${privacy} is not a valid party privacy. Use the enum`);
    }

    if (!this.Client.partyLock.active && this.config.privacy === privacy) throw new Error('Cannot change party privacy: You tried setting the privacy to the current one');

    const updated = {};
    const deleted = [];

    const privacySettings = this.meta.get('Default:PrivacySettings_j');
    if (privacySettings) {
      updated['Default:PrivacySettings_j'] = this.meta.set('Default:PrivacySettings_j', {
        PrivacySettings: {
          ...privacySettings.PrivacySettings,
          partyType: privacy.partyType,
          bOnlyLeaderFriendsCanJoin: privacy.onlyLeaderFriendsCanJoin,
          partyInviteRestriction: privacy.inviteRestriction,
        },
      });
    }

    updated['urn:epic:cfg:presence-perm_s'] = this.meta.set('urn:epic:cfg:presence-perm_s', privacy.presencePermission);
    updated['urn:epic:cfg:accepting-members_b'] = this.meta.set('urn:epic:cfg:accepting-members_b', privacy.acceptingMembers);
    updated['urn:epic:cfg:invite-perm_s'] = this.meta.set('urn:epic:cfg:invite-perm_s', privacy.invitePermission);

    if (['Public', 'FriendsOnly'].indexOf(privacy.partyType) > -1) deleted.push('urn:epic:cfg:not-accepting-members');

    if (privacy.partyType === 'Private') {
      updated['urn:epic:cfg:not-accepting-members-reason_i'] = 7;
    } else deleted.push('urn:epic:cfg:not-accepting-members-reason_i');

    await this.sendPatch(updated, deleted);
    this.config.privacy = privacy;
  }

  /**
   * Sets this party's custom matchmaking key
   * @param {string} key The custom matchmaking key
   * @returns {Promise<void>}
   */
  async setCustomMatchmakingKey(key) {
    await new Promise((res) => setTimeout(() => res(), 1000));
    await this.sendPatch({
      'Default:CustomMatchKey_s': this.meta.set('Default:CustomMatchKey_s', key || ''),
    });
    await new Promise((res) => setTimeout(() => res(), 500));
  }

  /**
   * Promotes a party member
   * @param {string} member The id or display name of the member that will be promoted
   * @returns {Promise<void>}
   */
  async promote(member) {
    if (!this.me.isLeader) throw new Error(`Cannot promote ${member}: Client isn't party leader`);
    const partyMember = this.members.find((m) => m.id === member || m.displayName === member);
    if (!partyMember) throw new Error(`Cannot promote ${member}: Member not in party`);
    const promotion = await this.Client.Http.send(true, 'POST',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${partyMember.id}/promote`, `bearer ${this.Client.Auth.auths.token}`);
    if (!promotion.success) throw new Error(`Cannot promote ${member}: ${this.Client.parseError(promotion.response)}`);
  }

  /**
   * Kicks a party member
   * @param {string} member The member that will be kicked
   * @returns {Promise<void>}
   */
  async kick(member) {
    if (!this.me.isLeader) throw new Error(`Cannot kick ${member}: Client isn't party leader`);
    const partyMember = this.members.find((m) => m.id === member || m.displayName === member);
    if (!partyMember) throw new Error(`Cannot kick ${member}: Member not in party`);
    const kick = await this.Client.Http.send(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.id}/members/${partyMember.id}`, `bearer ${this.Client.Auth.auths.token}`);
    if (!kick.success) throw new Error(`Cannot kick ${member}: ${this.Client.parseError(kick.response)}`);
  }

  /**
   * Refreshes the party members' positions
   * @returns {Promise<void>}
   * @private
   */
  async refreshSquadAssignments() {
    if (!this.patchAssignmentsLocked) await this.sendPatch({ 'Default:RawSquadAssignments_j': this.meta.updateSquadAssignments() });
  }

  async hideMembers(hide = true) {
    if (!this.me.isLeader) throw new Error(`Cannot ${hide ? '' : 'un'}hide party members: Client isn't party leader`);
    if (hide) {
      this.patchAssignmentsLocked = true;
      await this.sendPatch({
        'Default:RawSquadAssignments_j': this.meta.set('Default:RawSquadAssignments_j', {
          RawSquadAssignments: [{ memberId: this.Client.user.id, absoluteMemberIdx: 0 }],
        }),
      });
    } else {
      this.patchAssignmentsLocked = false;
      await this.refreshSquadAssignments();
    }
  }

  /**
   * Lookups for the client user's party
   * @param {Client} client The main client
   * @returns {Promise<Party>}
   */
  static async LookupSelf(client) {
    const party = await client.Http.send(true, 'GET', `${Endpoints.BR_PARTY}/user/${client.user.id}`, `bearer ${client.Auth.auths.token}`);
    if (!party.success) throw new Error(`Failed looking up clientparty: ${client.parseError(party.response)}`);
    if (!party.response.current[0]) return undefined;
    return new Party(client, party.response.current[0]);
  }

  /**
   * Lookups for a public party
   * @param {Client} client The main client
   * @param {string} id The id of the party
   * @returns {Promise<Party>}
   */
  static async Lookup(client, id) {
    const party = await client.Http.send(true, 'GET', `${Endpoints.BR_PARTY}/parties/${id}`, `bearer ${client.Auth.auths.token}`);
    if (!party.success) throw new Error(`Failed looking up party: ${client.parseError(party.response)}`);
    if (!party.response) throw new Error(`Failed looking up party: Party ${id} not found`);
    return new Party(client, party.response);
  }

  /**
   * Creates a party
   * @param {Client} client The main client
   * @returns {Promise<Party>}
   */
  static async Create(client, config) {
    client.partyLock.active = true;
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
          'urn:epic:member:dn_s': client.user.displayName,
        },
      },
      meta: {
        'urn:epic:cfg:party-type-id_s': 'default',
        'urn:epic:cfg:build-id_s': '1:1:',
        'urn:epic:cfg:join-request-action_s': 'Manual',
        'urn:epic:cfg:chat-enabled_b': partyConfig.chatEnabled.toString(),
      },
    });

    if (!party.success) {
      client.partyLock.active = false;
      throw new Error(`Failed creating party: ${client.parseError(party.response)}`);
    }

    party.response.config = { ...partyConfig, ...party.response.config || {} };
    const clientParty = new Party(client, party.response);
    client.party = clientParty;
    await client.party.chat.join();
    await client.party.setPrivacy(clientParty.config.privacy);
    client.partyLock.active = false;

    return client.party;
  }
}

module.exports = Party;
