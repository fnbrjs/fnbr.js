import { Collection } from '@discordjs/collection';
import { AsyncQueue } from '@sapphire/async-queue';
import { deprecate } from 'util';
import Endpoints from '../../../resources/Endpoints';
import FriendNotFoundError from '../../exceptions/FriendNotFoundError';
import PartyAlreadyJoinedError from '../../exceptions/PartyAlreadyJoinedError';
import PartyMaxSizeReachedError from '../../exceptions/PartyMaxSizeReachedError';
import PartyMemberNotFoundError from '../../exceptions/PartyMemberNotFoundError';
import PartyPermissionError from '../../exceptions/PartyPermissionError';
import ClientPartyMeta from './ClientPartyMeta';
import Party from './Party';
import PartyChat from './PartyChat';
import SentPartyInvitation from './SentPartyInvitation';
import { AuthSessionStoreKey } from '../../../resources/enums';
import EpicgamesAPIError from '../../exceptions/EpicgamesAPIError';
import type PartyMemberConfirmation from './PartyMemberConfirmation';
import type ClientPartyMember from './ClientPartyMember';
import type Client from '../../Client';
import type {
  Island, PartyData, PartyPrivacy, PartySchema,
} from '../../../resources/structs';
import type PartyMember from './PartyMember';
import type Friend from '../friend/Friend';

const deprecationNotOverXmppAnymore = 'Party Chat is not done over XMPP anymore, this function will be removed in a future version';

/**
 * Represents a party that the client is a member of
 */
class ClientParty extends Party {
  /**
   * The party patch queue
   */
  private patchQueue: AsyncQueue;

  /**
   * The party text chat
   */
  public chat: PartyChat;

  /**
   * The party's meta
   */
  public meta: ClientPartyMeta;

  /**
   * The hidden member ids
   */
  public hiddenMemberIds: Set<string>;

  /**
   * The pending member confirmations
   */
  public pendingMemberConfirmations: Collection<string, PartyMemberConfirmation>;

  /**
   * @param client The main client
   * @param data The party's data
   */
  constructor(client: Client, data: PartyData | Party) {
    super(client, data instanceof Party ? data.toObject() : data);
    this.hiddenMemberIds = new Set();
    this.pendingMemberConfirmations = new Collection();

    this.patchQueue = new AsyncQueue();
    this.chat = new PartyChat(this.client, this);
    this.meta = new ClientPartyMeta(this, data instanceof Party ? data.meta.schema : data.meta);
    if (this.eosPartyId) {
      this.meta.set('Default:LeaderData_j', { LeaderData: { epicPartyId: this.eosPartyId } });
    }
  }

  /**
   * Returns the client's party member
   */
  public get me() {
    return this.members.get(this.client.user.self!.id) as ClientPartyMember;
  }

  /**
   * Whether the party is private
   */
  public get isPrivate() {
    return this.config.privacy.partyType === 'Private';
  }

  /**
   * Leaves this party
   * @param createNew Whether a new party should be created
   * @throws {EpicgamesAPIError}
   */
  public async leave(createNew = true) {
    this.client.partyLock.lock();
    try {
      await this.client.http.epicgamesRequest({
        method: 'DELETE',
        url: `${Endpoints.BR_PARTY}/parties/${this.id}/members/${this.me?.id}`,
      }, AuthSessionStoreKey.Fortnite);
      if (!this.eosPartyId) throw new Error('Legacy Fortnite parties are not supported');
      await this.client.eosParty.removeMember(this.eosPartyId);
      this.client.party = undefined;
      await this.client.stomp.patchInternalPresence();
    } finally {
      this.client.partyLock.unlock();
    }
    if (createNew) await this.client.createParty();
  }

  /**
   * Sends a party patch to Epicgames' servers
   * @param updated The updated schema
   * @param deleted The deleted schema keys
   * @throws {PartyPermissionError} You're not the leader of this party
   * @throws {EpicgamesAPIError}
   */
  public async sendPatch(updated: PartySchema, deleted: (keyof PartySchema & string)[] = []): Promise<void> {
    await this.patchQueue.wait();
    const entries = Object.entries(updated).filter(([key]) => (
      !this.eosPartyId || (key.startsWith('Default:') && key !== 'VoiceChat:implementation_s')
    ));
    const chunks: Array<Array<[string, unknown]>> = [];
    for (let index = 0; index < entries.length; index += 32) chunks.push(entries.slice(index, index + 32));
    if (chunks.length === 0) chunks.push([]);
    try {
      for (const [chunkIndex, chunk] of chunks.entries()) {
        // Party revisions require each chunk to finish before the next one begins.
        // eslint-disable-next-line no-await-in-loop
        await this.sendPatchChunk(Object.fromEntries(chunk), chunkIndex === 0 ? deleted : []);
      }
    } finally {
      this.patchQueue.shift();
    }
  }

  private async sendPatchChunk(
    update: Record<string, unknown>,
    deleted: (keyof PartySchema & string)[],
    retriedValidation = false,
  ): Promise<void> {
    try {
      await this.client.http.epicgamesRequest({
        method: 'PATCH',
        url: `${Endpoints.BR_PARTY}/parties/${this.id}`,
        headers: { 'Content-Type': 'application/json' },
        data: {
          config: {
            join_confirmation: this.config.joinConfirmation,
            joinability: this.config.joinability,
            max_size: this.config.maxSize,
            discoverability: this.config.discoverability,
          },
          meta: { delete: deleted, update },
          party_state_overridden: {},
          party_privacy_type: this.config.joinability,
          party_type: this.config.type,
          party_sub_type: this.config.subType,
          max_number_of_members: this.config.maxSize,
          invite_ttl_seconds: this.config.inviteTtl,
          revision: this.revision,
        },
      }, AuthSessionStoreKey.Fortnite);
      this.revision += 1;
    } catch (error) {
      if (error instanceof EpicgamesAPIError && error.code === 'errors.com.epicgames.social.party.stale_revision') {
        this.revision = parseInt(error.messageVars[1], 10);
        await this.sendPatchChunk(update, deleted, retriedValidation);
        return;
      }
      if (error instanceof EpicgamesAPIError && error.code === 'errors.com.epicgames.validation.validation_failed' && !retriedValidation) {
        const supportedUpdate = Object.fromEntries(Object.entries(update).filter(([key]) => key.startsWith('Default:')));
        await this.sendPatchChunk(supportedUpdate, deleted, true);
        return;
      }
      if (error instanceof EpicgamesAPIError && error.code === 'errors.com.epicgames.social.party.party_change_forbidden') {
        throw new PartyPermissionError();
      }
      throw error;
    }
  }

  /**
   * Kicks a member from this party
   * @param member The member that should be kicked
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {PartyMemberNotFoundError} The party member wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async kick(member: string) {
    if (!this.me.isLeader) throw new PartyPermissionError();
    if (!this.eosPartyId) throw new Error('Legacy Fortnite parties are not supported');
    const partyMember = this.members.find((candidate: PartyMember) => candidate.displayName === member || candidate.id === member);
    if (!partyMember) throw new PartyMemberNotFoundError(member);
    await this.client.eosParty.removeMember(this.eosPartyId, partyMember.id);
  }

  /**
   * Sends a party invitation to a friend
   * @param friend The friend that will receive the invitation
   * @throws {FriendNotFoundError} The user is not friends with the client
   * @throws {PartyAlreadyJoinedError} The user is already a member of this party
   * @throws {PartyMaxSizeReachedError} The party reached its max size
   * @throws {EpicgamesAPIError}
   */
  public async invite(friend: string) {
    const resolvedFriend = this.client.friend.list.find((candidate: Friend) => candidate.id === friend || candidate.displayName === friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);
    if (!this.eosPartyId) throw new Error('Legacy Fortnite parties are not supported');
    if (this.members.has(resolvedFriend.id)) throw new PartyAlreadyJoinedError();
    if (this.size === this.maxSize) throw new PartyMaxSizeReachedError();
    await this.client.eosParty.invite(resolvedFriend.id);
    return new SentPartyInvitation(this.client, this, this.client.user.self!, resolvedFriend, {
      sent_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    });
  }

  /**
   * Refreshes the member positions of this party
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async refreshSquadAssignments() {
    if (!this.me.isLeader) throw new PartyPermissionError();

    await this.sendPatch({
      'Default:SquadInformation_j': this.meta.refreshSquadAssignments(),
    });
  }

  /**
   * Sends a message to the party chat
   * @param content The message that will be sent
   */
  public async sendMessage(content: string) {
    return this.chat.send(content);
  }

  /**
   * Ban a member from this party chat
   * @param member The member that should be banned
   * @deprecated This feature has been deprecated since epic moved chatting away from xmpp
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public async chatBan(member: string) {
    const deprecatedFn = deprecate(() => { }, deprecationNotOverXmppAnymore);

    return deprecatedFn();
  }

  /**
   * Updates this party's privacy settings
   * @param privacy The updated party privacy
   * @param sendPatch Whether the updated privacy should be sent to epic's servers
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async setPrivacy(privacy: PartyPrivacy, sendPatch = true) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    const updated: PartySchema = {};
    const deleted: (keyof PartySchema & string)[] = [];

    const privacyMeta = this.meta.get('Default:PrivacySettings_j');
    if (privacyMeta) {
      updated['Default:PrivacySettings_j'] = this.meta.set('Default:PrivacySettings_j', {
        PrivacySettings: {
          ...privacyMeta.PrivacySettings,
          partyType: privacy.partyType,
          bOnlyLeaderFriendsCanJoin: privacy.onlyLeaderFriendsCanJoin,
          partyInviteRestriction: privacy.inviteRestriction,
        },
      });
    }

    updated['urn:epic:cfg:presence-perm_s'] = this.meta.set('urn:epic:cfg:presence-perm_s', privacy.presencePermission);
    updated['urn:epic:cfg:accepting-members_b'] = this.meta.set('urn:epic:cfg:accepting-members_b', privacy.acceptingMembers);
    updated['urn:epic:cfg:invite-perm_s'] = this.meta.set('urn:epic:cfg:invite-perm_s', privacy.invitePermission);

    if (privacy.partyType === 'Private') {
      deleted.push('urn:epic:cfg:not-accepting-members');
      updated['urn:epic:cfg:not-accepting-members-reason_i'] = this.meta.set('urn:epic:cfg:not-accepting-members-reason_i', 7);
      this.config.discoverability = 'INVITED_ONLY';
      this.config.joinability = 'INVITE_AND_FORMER';
    } else {
      deleted.push('urn:epic:cfg:not-accepting-members-reason_i');
      this.config.discoverability = 'ALL';
      this.config.joinability = 'OPEN';
    }

    this.meta.remove(deleted);
    if (this.eosPartyId) {
      const state = await this.client.eosParty.getUserState();
      await this.client.eosParty.setJoinability(
        this.eosPartyId,
        privacy.partyType === 'Private' ? 'INVITE_ONLY' : 'OPEN',
        state.current?.revision ?? 0,
      );
    }

    if (sendPatch) await this.sendPatch(updated, deleted);
    this.config.privacy = {
      ...this.config.privacy,
      ...privacy,
    };

    return { updated, deleted };
  }

  /**
   * Sets this party's custom matchmaking key
   * @param key The custom matchmaking key
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async setCustomMatchmakingKey(key?: string) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    await this.sendPatch({
      'Default:CustomMatchKey_s': this.meta.set('Default:CustomMatchKey_s', key || ''),
    });
  }

  /**
   * Promotes a party member
   * @param member The member that should be promoted
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {PartyMemberNotFoundError} The party member wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async promote(member: string) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    const partyMember = this.members.find((m: PartyMember) => m.displayName === member || m.id === member);
    if (!partyMember) throw new PartyMemberNotFoundError(member);

    try {
      await this.client.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.BR_PARTY}/parties/${this.id}/members/${partyMember.id}/promote`,
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.social.party.party_change_forbidden') {
        throw new PartyPermissionError();
      }

      throw e;
    }
  }

  /**
   * Hides / Unhides a single party member
   * @param member The member that should be hidden
   * @param hide Whether the member should be hidden
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {PartyMemberNotFoundError} The party member wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async hideMember(member: string, hide = true) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    const partyMember = this.members.find((m: PartyMember) => m.displayName === member || m.id === member);
    if (!partyMember) throw new PartyMemberNotFoundError(member);

    if (hide) {
      this.hiddenMemberIds.add(partyMember.id);
    } else {
      this.hiddenMemberIds.delete(partyMember.id);
    }

    await this.refreshSquadAssignments();
  }

  /**
   * Hides / Unhides all party members except for the client
   * @param hide Whether all members should be hidden
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async hideMembers(hide = true) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    if (hide) {
      this.members.filter((m: PartyMember) => m.id !== this.me.id).forEach((m: PartyMember) => this.hiddenMemberIds.add(m.id));
    } else {
      this.hiddenMemberIds.clear();
    }

    await this.refreshSquadAssignments();
  }

  /**
   * Updates the party's playlist
   * @param mnemonic The new mnemonic (Playlist id or island code, for example: playlist_defaultduo or 1111-1111-1111)
   * @param regionId The new region id
   * @param version The new version
   * @param options Playlist options
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async setPlaylist(mnemonic: string, regionId?: string, version?: number, options?: Omit<Island, 'linkId'>) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    let regionIdData = this.meta.get('Default:RegionId_s');
    if (regionId) {
      regionIdData = this.meta.set('Default:RegionId_s', regionId);
    }

    let data = this.meta.get('Default:SelectedIsland_j');
    data = this.meta.set('Default:SelectedIsland_j', {
      ...data,
      SelectedIsland: {
        ...data.SelectedIsland,
        linkId: {
          mnemonic,
          version: version ?? -1,
        },
        ...options,
      },
    });

    await this.sendPatch({
      'Default:SelectedIsland_j': data,
      'Default:RegionId_s': regionIdData,
    });
  }

  /**
   * Updates the squad fill status of this party
   * @param fill Whether fill is enable or not
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async setSquadFill(fill = true) {
    if (!this.me.isLeader) throw new PartyPermissionError();

    await this.sendPatch({
      'Default:AthenaSquadFill_b': this.meta.set('Default:AthenaSquadFill_b', fill),
    });
  }

  /**
   * Updates the party's max member count
   * @param maxSize The new party max size (1-16)
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {RangeError} The new max member size must be between 1 and 16 (inclusive) and more than the current member count
   * @throws {EpicgamesAPIError}
   */
  public async setMaxSize(maxSize: number) {
    if (!this.me.isLeader) throw new PartyPermissionError();
    if (maxSize < 1 || maxSize > 16) throw new RangeError('The new max member size must be between 1 and 16 (inclusive)');

    if (maxSize < this.size) throw new RangeError('The new max member size must be higher than the current member count');

    this.config.maxSize = maxSize;
    await this.sendPatch(this.meta.schema);
  }
}

export default ClientParty;
