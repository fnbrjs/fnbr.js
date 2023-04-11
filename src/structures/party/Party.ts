import { Collection } from '@discordjs/collection';
import Endpoints from '../../../resources/Endpoints';
import { PartyPrivacy } from '../../../enums/Enums';
import Base from '../../Base';
import PartyAlreadyJoinedError from '../../exceptions/PartyAlreadyJoinedError';
import { makeCamelCase, makeSnakeCase } from '../../util/Util';
import ClientPartyMember from './ClientPartyMember';
import PartyMember from './PartyMember';
import PartyMeta from './PartyMeta';
import { AuthSessionStoreKey } from '../../../resources/enums';
import type Client from '../../Client';
import type {
  PartyConfig, PartyData, PartySchema, PartyUpdateData,
} from '../../../resources/structs';

/**
 * Represents a party that the client is not a member of
 */
class Party extends Base {
  /**
   * The party's ID
   */
  public id: string;

  /**
   * The party's creation date
   */
  public createdAt: Date;

  /**
   * The party configuration
   */
  public config: PartyConfig;

  /**
   * A collection of the party members mapped by their ID
   */
  public members: Collection<string, PartyMember | ClientPartyMember>;

  /**
   * The party's meta
   */
  public meta: PartyMeta;

  /**
   * The party's revision
   */
  public revision: number;

  /**
   * @param client The main client
   * @param data The party's data
   */
  constructor(client: Client, data: PartyData) {
    super(client);

    this.id = data.id;
    this.createdAt = new Date(data.created_at);
    this.config = makeCamelCase(data.config);
    this.config.privacy = this.config.joinability === 'OPEN' ? PartyPrivacy.PUBLIC : PartyPrivacy.PRIVATE;
    this.meta = new PartyMeta(data.meta);
    this.revision = data.revision || 0;

    this.members = new Collection(data.members.map((m) => {
      if (m.account_id === this.client.user.self!.id) return [m.account_id, new ClientPartyMember(this, m)];
      return [m.account_id, new PartyMember(this, m)];
    }));
  }

  /**
   * The party's member count
   */
  public get size() {
    return this.members.size;
  }

  /**
   * The party's max member count
   */
  public get maxSize() {
    return this.config.maxSize;
  }

  /**
   * The party's leader
   */
  public get leader() {
    return this.members.find((m: PartyMember) => m.role === 'CAPTAIN');
  }

  /**
   * The currently selected playlist
   */
  public get playlist() {
    return this.meta.playlist;
  }

  /**
   * The custom matchmaking key
   */
  public get customMatchmakingKey() {
    return this.meta.customMatchmakingKey;
  }

  /**
   * The squad fill status
   */
  public get squadFill() {
    return this.meta.squadFill;
  }

  /**
   * Joins this party
   * @param skipRefresh Whether to skip refreshing the party data (Only use this if you know what you're doing)
   * @throws {PartyAlreadyJoinedError} The client already joined this party
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched due to a permission error
   * @throws {PartyMaxSizeReachedError} The party has reached its max size
   * @throws {EpicgamesAPIError}
   */
  public async join(skipRefresh = false) {
    if (!skipRefresh) {
      await this.fetch();
    }

    if (this.members.get(this.client.user.self!.id)) throw new PartyAlreadyJoinedError();

    this.client.partyLock.lock();
    if (this.client.party) await this.client.party.leave(false);

    try {
      await this.client.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.client.user.self!.id}/join`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          connection: {
            id: this.client.xmpp.JID,
            meta: {
              'urn:epic:conn:platform_s': this.client.config.platform,
              'urn:epic:conn:type_s': 'game',
            },
            yield_leadership: false,
          },
          meta: {
            'urn:epic:member:dn_s': this.client.user.self!.displayName,
            'urn:epic:member:joinrequestusers_j': JSON.stringify({
              users: [
                {
                  id: this.client.user.self!.id,
                  dn: this.client.user.self!.displayName,
                  plat: this.client.config.platform,
                  data: JSON.stringify({
                    CrossplayPreference: '1',
                    SubGame_u: '1',
                  }),
                },
              ],
            }),
          },
        },
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      this.client.partyLock.unlock();
      await this.client.initParty(true, false);

      throw e;
    }

    this.client.setClientParty(this);
    await this.client.party!.chat.join();
    this.client.partyLock.unlock();
  }

  /**
   * Updates this party's data
   */
  public updateData(data: PartyUpdateData) {
    if (data.revision > this.revision) this.revision = data.revision;
    this.meta.update(data.party_state_updated ?? {}, true);
    this.meta.remove(data.party_state_removed as (keyof PartySchema & string)[] ?? []);

    this.config.joinability = data.party_privacy_type;
    this.config.maxSize = data.max_number_of_members;
    this.config.subType = data.party_sub_type;
    this.config.type = data.party_type;
    this.config.inviteTtl = data.invite_ttl_seconds;
    this.config.discoverability = data.discoverability;

    let privacy = this.meta.get('Default:PrivacySettings_j');
    privacy = Object.values(PartyPrivacy)
      .find((val) => val.partyType === privacy.PrivacySettings.partyType
        && val.inviteRestriction === privacy.PrivacySettings.partyInviteRestriction
        && val.onlyLeaderFriendsCanJoin === privacy.PrivacySettings.bOnlyLeaderFriendsCanJoin);
    if (privacy) this.config.privacy = privacy;
  }

  /**
   * Updates the basic user information (display name and external auths) of all party members
   */
  public async updateMemberBasicInfo() {
    const users = await this.client.user.fetchMultiple(this.members.map((m: PartyMember) => m.id));
    users.forEach((u) => this.members.get(u.id)?.update(u));
  }

  /**
   * Refetches this party's data
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched due to a permission error
   * @throws {EpicgamesAPIError}
   */
  public async fetch() {
    const partyData = await this.client.getParty(this.id, true) as PartyData;

    this.createdAt = new Date(partyData.created_at);
    this.config = makeCamelCase(partyData.config);
    this.config.privacy = this.config.joinability === 'OPEN' ? PartyPrivacy.PUBLIC : PartyPrivacy.PRIVATE;
    this.meta = new PartyMeta(partyData.meta);
    this.revision = partyData.revision || 0;

    // eslint-disable-next-line arrow-body-style
    this.members = new Collection(partyData.members.map((m) => {
      if (m.account_id === this.client.user.self!.id) return [m.account_id, new ClientPartyMember(this, m)];
      return [m.account_id, new PartyMember(this, m)];
    }));
  }

  /**
   * Converts this party into an object
   */
  public toObject(): PartyData {
    return {
      id: this.id,
      created_at: this.createdAt.toISOString(),
      config: makeSnakeCase(this.config),
      invites: [],
      members: this.members.map((m: PartyMember) => m.toObject()),
      meta: this.meta.schema,
      revision: 0,
      updated_at: new Date().toISOString(),
    };
  }
}

export default Party;
