import { Collection } from '@discordjs/collection';
import { PartyPrivacy } from '../../../enums/Enums';
import Base from '../../Base';
import PartyAlreadyJoinedError from '../../exceptions/PartyAlreadyJoinedError';
import { makeCamelCase, makeSnakeCase } from '../../util/Util';
import ClientPartyMember from './ClientPartyMember';
import PartyMember from './PartyMember';
import PartyMeta from './PartyMeta';
import type Client from '../../Client';
import type {
  EOSPartyData, EOSPartyDataConfig, FortnitePartyConfig, FortnitePartyData, FortnitePartySchema,
  FortnitePartyUpdateData,
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
   * The party's EOS ID
   */
  public eosId: string;

  /**
   * The party's creation date
   */
  public createdAt: Date;

  /**
   * The party configuration
   */
  public config: FortnitePartyConfig;

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
   * The party's EOS revision
   */
  public eosRevision: number;

  /**
   * The party's leader ID
   */
  public eosLeaderId: string;

  /**
   * The party's EOS chat conversation ID
   */
  public eosChatConversationId: string;

  /**
   * The party's EOS config
   */
  public eosConfig: EOSPartyDataConfig;

  /**
   * @param client The main client
   * @param fnData The party's Fortnite data
   * @param eosData The party's EOS data
   */
  constructor(client: Client, fnData: FortnitePartyData, eosData: EOSPartyData) {
    super(client);

    this.id = fnData.id;
    this.eosId = eosData.id;
    this.createdAt = new Date(fnData.created_at);
    this.config = makeCamelCase(fnData.config);
    this.config.privacy = this.config.joinability === 'OPEN' ? PartyPrivacy.PUBLIC : PartyPrivacy.PRIVATE;
    this.meta = new PartyMeta(fnData.meta);
    this.revision = fnData.revision || 0;
    this.eosRevision = eosData.revision;

    this.eosLeaderId = eosData.party_lead;
    this.eosChatConversationId = eosData.chat_conversation_id;
    this.eosConfig = eosData.config;

    // Only using fnData.members seems sufficient, for now
    this.members = new Collection(fnData.members.map((fnM) => {
      if (fnM.account_id === this.client.user.self!.id) return [fnM.account_id, new ClientPartyMember(this, fnM)];
      return [fnM.account_id, new PartyMember(this, fnM)];
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
    return this.members.get(this.eosLeaderId);
  }

  /**
   * The currently selected playlist
   */
  public get playlist() {
    return this.meta.island;
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
    if (!skipRefresh) await this.fetch();

    if (this.members.get(this.client.user.self!.id)) throw new PartyAlreadyJoinedError();
    await this.client.joinParty(this.id);
  }

  /**
   * Updates this party's data
   */
  public updateFortniteData(data: FortnitePartyUpdateData) {
    if (data.revision > this.revision) this.revision = data.revision;
    this.meta.update(data.party_state_updated ?? {}, true);
    this.meta.remove(data.party_state_removed as (keyof FortnitePartySchema & string)[] ?? []);

    this.config.joinability = data.party_privacy_type;
    this.config.maxSize = data.max_number_of_members;
    this.config.subType = data.party_sub_type;
    this.config.type = data.party_type;
    this.config.inviteTtl = data.invite_ttl_seconds;

    let privacy = this.meta.get('Default:PrivacySettings_j');
    privacy = Object.values(PartyPrivacy)
      .find((val) => val.partyType === privacy.PrivacySettings.partyType
        && val.inviteRestriction === privacy.PrivacySettings.partyInviteRestriction
        && val.onlyLeaderFriendsCanJoin === privacy.PrivacySettings.bOnlyLeaderFriendsCanJoin);
    if (privacy) this.config.privacy = privacy;
  }

  /**
   * Updates this party's EOS data
   */
  public updateEOSData(data: EOSPartyData) {
    if (data.revision > this.eosRevision!) this.eosRevision = data.revision;

    this.eosLeaderId = data.party_lead;
    this.eosChatConversationId = data.chat_conversation_id;
    this.eosConfig = data.config;
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
    const partyData = await this.client.getRawFortniteParty(this.id);

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
  public toObject(): FortnitePartyData {
    return {
      id: this.id,
      created_at: this.createdAt.toISOString(),
      config: makeSnakeCase(this.config),
      invites: [],
      members: this.members.map((m: PartyMember) => m.toObject()),
      meta: this.meta.schema,
      revision: this.revision,
      updated_at: new Date().toISOString(),
    };
  }

  public toEOSObject(): EOSPartyData {
    return {
      id: this.eosId,
      party_lead: this.eosLeaderId,
      created_at: this.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
      config: this.eosConfig,
      meta: {},
      revision: this.eosRevision,
      chat_conversation_id: this.eosChatConversationId,
      is_reportable: false,
    };
  }
}

export default Party;
