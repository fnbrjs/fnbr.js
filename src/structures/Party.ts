import Collection from '@discordjs/collection';
import { PartyPrivacy } from '../../enums/Enums';
import { PartyConfig, PartyData, PartyUpdateData } from '../../resources/structs';
import Base from '../client/Base';
import Client from '../client/Client';
import PartyAlreadyJoinedError from '../exceptions/PartyAlreadyJoinedError';
import { makeCamelCase, makeSnakeCase } from '../util/Util';
import ClientPartyMember from './ClientPartyMember';
import ClientUser from './ClientUser';
import PartyMember from './PartyMember';
import PartyMeta from './PartyMeta';

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
    this.meta = new PartyMeta(this, data.meta);
    this.revision = data.revision || 0;

    // eslint-disable-next-line arrow-body-style
    this.members = new Collection(data.members.map((m) => {
      if (m.account_id === this.client.user?.id) return [m.account_id, new ClientPartyMember(this, m)];
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
    return this.members.find((m) => m.role === 'CAPTAIN');
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
   * Join this party
   * @throws {PartyAlreadyJoinedError} The client already joined this party
   * @throws {EpicgamesAPIError}
   */
  public async join() {
    if (this.members.get((this.client.user as ClientUser).id)) throw new PartyAlreadyJoinedError();
    return this.client.joinParty(this.id);
  }

  /**
   * Updates this party's data
   */
  public updateData(data: PartyUpdateData) {
    if (data.revision > this.revision) this.revision = data.revision;
    this.meta.update(data.party_state_updated, true);
    this.meta.remove(data.party_state_removed);

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
    const users = await this.client.getProfile(this.members.map((m) => m.id));
    users.forEach((u) => this.members.get(u.id)?.update(u));
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
      members: this.members.map((m) => m.toObject()),
      meta: this.meta.schema,
      revision: 0,
      updated_at: new Date().toISOString(),
    };
  }
}

export default Party;
