import { Schema } from '../../resources/structs';
import ClientParty from './ClientParty';
import PartyMeta from './PartyMeta';

/**
 * Represents the client's party meta
 */
class ClientPartyMeta extends PartyMeta {
  /**
   * The party
   */
  public party!: ClientParty;

  /**
   * @param party The party
   * @param schema The schema
   */
  constructor(party: ClientParty, schema: Schema) {
    super(party, {
      'Default:PrimaryGameSessionId_s': '',
      'Default:PartyState_s': 'BattleRoyaleView',
      'Default:LobbyConnectionStarted_b': 'false',
      'Default:MatchmakingResult_s': 'NoResults',
      'Default:MatchmakingState_s': 'NotMatchmaking',
      'Default:SessionIsCriticalMission_b': 'false',
      'Default:ZoneTileIndex_U': '-1',
      'Default:ZoneInstanceId_s': '',
      'Default:TheaterId_s': '',
      'Default:TileStates_j': JSON.stringify({
        TileStates: [],
      }),
      'Default:MatchmakingInfoString_s': '',
      'Default:CustomMatchKey_s': '',
      'Default:PlaylistData_j': JSON.stringify({
        PlaylistData: {
          playlistName: 'Playlist_DefaultSquad',
          tournamentId: '',
          eventWindowId: '',
          regionId: 'EU',
        },
      }),
      'Default:AthenaSquadFill_b': 'true',
      'Default:AllowJoinInProgress_b': 'false',
      'Default:LFGTime_s': '0001-01-01T00:00:00.000Z',
      'Default:PartyIsJoinedInProgress_b': 'false',
      'Default:GameSessionKey_s': '',
      'Default:RawSquadAssignments_j': '',
      'Default:PrivacySettings_j': JSON.stringify({
        PrivacySettings: {
          partyType: party.config.privacy.partyType,
          partyInviteRestriction: party.config.privacy.inviteRestriction,
          bOnlyLeaderFriendsCanJoin: party.config.privacy.onlyLeaderFriendsCanJoin,
        },
      }),
      'Default:PlatformSessions_j': JSON.stringify({
        PlatformSessions: [],
      }),
      'VoiceChat:implementation_s': 'VivoxVoiceChat',
      'Default:CreativeDiscoverySurfaceRevisions_j': JSON.stringify({
        CreativeDiscoverySurfaceRevisions: [],
      }),
      'Default:PartyMatchmakingInfo_j': JSON.stringify({
        PartyMatchmakingInfo: {
          buildId: -1,
          hotfixVersion: -1,
          regionId: '',
          playlistName: 'None',
          playlistRevision: 0,
          tournamentId: '',
          eventWindowId: '',
          linkCode: '',
        },
      }),
    });

    if (schema) this.update(schema, true);
    this.refreshSquadAssignments();
  }

  /**
   * Refreshes the member positions
   */
  public refreshSquadAssignments() {
    let i = 0;
    const assignments = [];

    if (this.party.me && !this.party.hiddenMemberIds.includes(this.party.me.id)) {
      assignments.push({
        memberId: this.party.client.user?.id,
        absoluteMemberIdx: 0,
      });
      i += 1;
    }

    this.party.members.forEach((m) => {
      if (m.id !== this.party.client.user?.id && !this.party.hiddenMemberIds.includes(m.id)) {
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
}

export default ClientPartyMeta;
