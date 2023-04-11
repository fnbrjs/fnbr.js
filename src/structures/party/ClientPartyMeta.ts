import defaultPartyMeta from '../../../resources/defaultPartyMeta.json';
import PartyMeta from './PartyMeta';
import type { PartySchema } from '../../../resources/structs';
import type ClientParty from './ClientParty';
import type PartyMember from './PartyMember';

/**
 * Represents the client's party meta
 */
class ClientPartyMeta extends PartyMeta {
  /**
   * The party
   */
  public party: ClientParty;

  /**
   * @param party The party
   * @param schema The schema
   */
  constructor(party: ClientParty, schema: PartySchema) {
    super({ ...defaultPartyMeta });

    this.party = party;

    this.refreshSquadAssignments();
    this.updatePrivacy();
    if (schema) this.update(schema, true);
  }

  /**
   * Refreshes the member positions
   */
  public refreshSquadAssignments() {
    let i = 0;
    const assignments = [];

    if (this.party.me && !this.party.hiddenMemberIds.has(this.party.me.id)) {
      assignments.push({
        memberId: this.party.client.user.self!.id,
        absoluteMemberIdx: 0,
      });
      i += 1;
    }

    this.party.members.forEach((m: PartyMember) => {
      if (m.id !== this.party.client.user.self!.id && !this.party.hiddenMemberIds.has(m.id)) {
        assignments.push({
          memberId: m.id,
          absoluteMemberIdx: i,
        });
        i += 1;
      }
    });

    return this.set('Default:RawSquadAssignments_j', {
      RawSquadAssignments: assignments,
    });
  }

  public updatePrivacy() {
    this.set('Default:PrivacySettings_j', {
      PrivacySettings: {
        partyType: this.party.config.privacy.partyType,
        partyInviteRestriction: this.party.config.privacy.inviteRestriction,
        bOnlyLeaderFriendsCanJoin: this.party.config.privacy.onlyLeaderFriendsCanJoin,
      },
    });
  }
}

export default ClientPartyMeta;
