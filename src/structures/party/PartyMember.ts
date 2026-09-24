import PartyPermissionError from '../../exceptions/PartyPermissionError';
import PartyMemberMeta from './PartyMemberMeta';
import User from '../user/User';
import type Party from './Party';
import type ClientParty from './ClientParty';
import type {
  FortnitePartyMemberData, FortnitePartyMemberSchema, FortnitePartyMemberUpdateData,
} from '../../../resources/structs';

/**
 * Represents a party member
 */
class PartyMember extends User {
  /**
   * The date when this member joined the party
   */
  public joinedAt: Date;

  /**
   * The member's meta
   */
  public meta: PartyMemberMeta;

  /**
   * The party this member belongs to
   */
  public party: Party | ClientParty;

  /**
   * The member's revision
   */
  public revision: number;

  /**
   * Whether this member has received an initial state update
   */
  public receivedInitialStateUpdate: boolean;

  /**
   * @param party The party this member belongs to
   * @param data The member's data
   */
  constructor(party: Party | ClientParty, fnData: FortnitePartyMemberData) {
    super(party.client, {
      ...fnData,
      displayName: fnData.account_dn,
      id: fnData.account_id,
    });

    this.party = party;
    this.joinedAt = new Date(fnData.joined_at);
    this.meta = new PartyMemberMeta(fnData.meta);
    this.revision = fnData.revision;
    this.receivedInitialStateUpdate = false;
  }

  /**
   * Whether this member is the leader of the party
   */
  public get isLeader() {
    return this.party.leader?.id === this.id;
  }

  /**
   * The member's currently equipped outfit CID
   */
  public get outfit() {
    return this.meta.outfit;
  }

  /**
   * The member's currently equipped pickaxe ID
   */
  public get pickaxe() {
    return this.meta.pickaxe;
  }

  /**
   * The member's current emote EID
   */
  public get emote() {
    return this.meta.emote;
  }

  /**
   * The member's currently equipped backpack BID
   */
  public get backpack() {
    return this.meta.backpack;
  }

  /**
   * The member's currently equipped shoes
   */
  public get shoes() {
    return this.meta.shoes;
  }

  /**
   * Whether the member is ready
   */
  public get isReady() {
    return this.meta.isReady;
  }

  /**
   * Whether the member is sitting out
   */
  public get isSittingOut() {
    return this.meta.isSittingOut;
  }

  /**
   * The member's current input method
   */
  public get inputMethod() {
    return this.meta.input;
  }

  /**
   * The member's cosmetic variants
   */
  public get variants() {
    return this.meta.variants;
  }

  /**
   * The member's banner info
   */
  public get banner() {
    return this.meta.banner;
  }

  /**
   * The member's battlepass info
   */
  public get battlepass() {
    return this.meta.battlepass;
  }

  /**
   * The member's platform
   */
  public get platform() {
    return this.meta.platform;
  }

  /**
   * The member's match info
   */
  public get matchInfo() {
    return this.meta.match;
  }

  /**
   * The member's current playlist
   */
  public get playlist() {
    return this.meta.island;
  }

  /**
   * Whether a marker has been set
   */
  public get isMarkerSet() {
    return this.meta.isMarkerSet;
  }

  /**
   * The member's marker location [x, y] tuple.
   * [0, 0] if there is no marker set
   */
  public get markerLocation() {
    return this.meta.markerLocation;
  }

  /**
   * Kicks this member from the client's party.
   * @throws {PartyPermissionError} The client is not a member or not the leader of the party
   */
  public async kick() {
    // This is a very hacky solution, but it's required since we cannot import ClientParty (circular dependencies)
    if (typeof (this.party as any).kick !== 'function') throw new PartyPermissionError();
    return (this.party as any).kick(this.id);
  }

  /**
   * Promotes this member
   * @throws {PartyPermissionError} The client is not a member or not the leader of the party
   */
  public async promote() {
    // This is a very hacky solution, but it's required since we cannot import ClientParty (circular dependencies)
    if (typeof (this.party as any).promote !== 'function') throw new PartyPermissionError();
    return (this.party as any).promote(this.id);
  }

  /**
   * Hides this member
   * @param hide Whether the member should be hidden
   * @throws {PartyPermissionError} The client is not the leader of the party
   * @throws {EpicgamesAPIError}
   */
  public async hide(hide = true) {
    // This is a very hacky solution, but it's required since we cannot import ClientParty (circular dependencies)
    if (typeof (this.party as any).hideMember !== 'function') throw new PartyPermissionError();
    return (this.party as any).hideMember(this.id, hide);
  }

  /**
   * Bans this member from the client's party.
   */
  public async chatBan() {
    // This is a very hacky solution, but it's required since we cannot import ClientParty (circular dependencies)
    if (typeof (this.party as any).chatBan !== 'function') throw new PartyPermissionError();
    return (this.party as any).chatBan(this.id);
  }

  /**
   * Updates this member's Fortnite metadata.
   * @param data The update data
   * @returns Whether any observable member data changed
   */
  public updateData(data: FortnitePartyMemberUpdateData): boolean {
    if (data.revision < this.revision) return false;

    this.revision = data.revision;
    this.receivedInitialStateUpdate = true;

    let changed = false;
    if (data.account_dn !== undefined && data.account_dn !== this.displayName) {
      this.update({ id: this.id, displayName: data.account_dn, externalAuths: this.externalAuths });
      changed = true;
    }

    for (const [key, value] of Object.entries(data.member_state_updated)) {
      const memberKey = key as keyof FortnitePartyMemberSchema;
      if (value !== undefined && this.meta.schema[memberKey] !== value) {
        this.meta.set(memberKey, value, true);
        changed = true;
      }
    }
    for (const key of data.member_state_removed) {
      if (Object.prototype.hasOwnProperty.call(this.meta.schema, key)) {
        this.meta.remove([key as keyof FortnitePartyMemberSchema]);
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Converts this party member into an object
   */
  public toObject(): FortnitePartyMemberData {
    return {
      id: this.id,
      account_id: this.id,
      joined_at: this.joinedAt.toISOString(),
      updated_at: new Date().toISOString(),
      meta: this.meta.schema,
      revision: 0,
      account_dn: this.displayName,
    };
  }
}

export default PartyMember;
