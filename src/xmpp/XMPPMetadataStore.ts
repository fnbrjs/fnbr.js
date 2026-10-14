import Base from '../Base';
import type ClientParty from '../structures/party/ClientParty';
import type PartyMember from '../structures/party/PartyMember';
import type { FortnitePartyMemberUpdateData } from '../../resources/structs';

const MEMBER_METADATA_TTL_MS = 10000;

/**
 * Buffers Fortnite member metadata until STOMP has created the roster member.
 */
class XMPPMetadataStore extends Base {
  private pendingMemberUpdates = new Map<string, { updates: FortnitePartyMemberUpdateData[]; timer: NodeJS.Timeout }>();

  public handleMemberMetadata(party: ClientParty, update: FortnitePartyMemberUpdateData) {
    const member = party.members.get(update.account_id);
    if (member) {
      this.applyMemberMetadata(member, update);
      return;
    }

    const key = `${party.id}:${update.account_id}`;
    const pending = this.pendingMemberUpdates.get(key);
    if (pending) {
      pending.updates.push(update);
      return;
    }

    const timer = setTimeout(() => this.pendingMemberUpdates.delete(key), MEMBER_METADATA_TTL_MS);
    timer.unref();
    this.pendingMemberUpdates.set(key, { updates: [update], timer });
  }

  /** Applies Fortnite metadata that arrived before STOMP created this member. */
  public flushMemberMetadata(party: ClientParty, member: PartyMember) {
    const key = `${party.id}:${member.id}`;
    const pending = this.pendingMemberUpdates.get(key);
    if (!pending) return;

    this.discardMemberMetadata(party.id, member.id);
    pending.updates.sort((a, b) => a.revision - b.revision);
    for (const update of pending.updates) this.applyMemberMetadata(member, update);
  }

  /** Drops metadata for a member removed from the STOMP roster. */
  public discardMemberMetadata(partyId: string, accountId: string) {
    const key = `${partyId}:${accountId}`;
    const pending = this.pendingMemberUpdates.get(key);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pendingMemberUpdates.delete(key);
  }

  /** Clears pending metadata when XMPP disconnects. */
  public clear() {
    for (const pending of this.pendingMemberUpdates.values()) clearTimeout(pending.timer);
    this.pendingMemberUpdates.clear();
  }

  private applyMemberMetadata(member: PartyMember, update: FortnitePartyMemberUpdateData) {
    if (update.revision < member.revision) return;

    const previous = {
      outfit: member.outfit,
      emote: member.emote,
      backpack: member.backpack,
      pickaxe: member.pickaxe,
      readiness: member.isReady,
      matchstate: member.matchInfo,
    };

    if (!member.updateData(update)) return;

    if (previous.outfit !== member.outfit) this.client.emit('party:member:outfit:updated', member, member.outfit, previous.outfit);
    if (previous.emote !== member.emote) this.client.emit('party:member:emote:updated', member, member.emote, previous.emote);
    if (previous.backpack !== member.backpack) this.client.emit('party:member:backpack:updated', member, member.backpack, previous.backpack);
    if (previous.pickaxe !== member.pickaxe) this.client.emit('party:member:pickaxe:updated', member, member.pickaxe, previous.pickaxe);
    if (previous.readiness !== member.isReady) this.client.emit('party:member:readiness:updated', member, member.isReady, previous.readiness);

    const matchstate = member.matchInfo;
    if (previous.matchstate.location !== matchstate.location
      || previous.matchstate.hasPreloadedAthena !== matchstate.hasPreloadedAthena
      || previous.matchstate.isSpectatable !== matchstate.isSpectatable
      || previous.matchstate.playerCount !== matchstate.playerCount
      || previous.matchstate.matchStartedAt?.valueOf() !== matchstate.matchStartedAt?.valueOf()) {
      this.client.emit('party:member:matchstate:updated', member, matchstate, previous.matchstate);
    }

    this.client.emit('party:member:updated', member);
  }
}

export default XMPPMetadataStore;
