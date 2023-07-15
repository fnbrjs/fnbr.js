import PartyPermissionError from '../../exceptions/PartyPermissionError';
import PartyMemberMeta from './PartyMemberMeta';
import User from '../user/User';
import type Party from './Party';
import type ClientParty from './ClientParty';
import type { PartyMemberData, PartyMemberSchema, PartyMemberUpdateData } from '../../../resources/structs';

/**
 * Represents a party member
 */
class PartyMember extends User {
  /**
   * The member's role. "CAPTAIN" means leader
   */
  public role: string;

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
  constructor(party: Party | ClientParty, data: PartyMemberData) {
    super(party.client, {
      ...data,
      displayName: data.account_dn,
      id: data.account_id,
    });

    this.party = party;
    this.role = data.role;
    this.joinedAt = new Date(data.joined_at);
    this.meta = new PartyMemberMeta(data.meta);
    this.revision = data.revision;
    this.receivedInitialStateUpdate = false;
  }

  /**
   * Whether this member is the leader of the party
   */
  public get isLeader() {
    return this.role === 'CAPTAIN';
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
   * The member's custom data store
   */
  public get customDataStore() {
    return this.meta.customDataStore;
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
   * Updates this members data
   * @param data The update data
   */
  public updateData(data: PartyMemberUpdateData) {
    if (data.revision > this.revision) this.revision = data.revision;
    if (data.account_dn !== this.displayName) this.update({ id: this.id, displayName: data.account_dn, externalAuths: this.externalAuths });

    this.meta.update(data.member_state_updated, true);
    this.meta.remove(data.member_state_removed as (keyof PartyMemberSchema)[]);
  }

  /**
   * Converts this party member into an object
   */
  public toObject(): PartyMemberData {
    return {
      id: this.id,
      account_id: this.id,
      joined_at: this.joinedAt.toISOString(),
      updated_at: new Date().toISOString(),
      meta: this.meta.schema,
      revision: 0,
      role: this.role,
      account_dn: this.displayName,
    };
  }
}

export default PartyMember;
