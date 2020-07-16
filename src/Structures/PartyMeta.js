const Meta = require('../Util/Meta');

class PartyMeta extends Meta {
  constructor(party, meta) {
    super();

    Object.defineProperty(this, 'Party', { value: party });

    this.schema = {
      PrimaryGameSessionId_s: '',
      PartyState_s: 'BattleRoyaleView',
      LobbyConnectionStarted_b: 'false',
      MatchmakingResult_s: 'NoResults',
      MatchmakingState_s: 'NotMatchmaking',
      SessionIsCriticalMission_b: 'false',
      ZoneTileIndex_U: '-1',
      ZoneInstanceId_s: '',
      TheaterId_s: '',
      TileStates_j: JSON.stringify({
        TileStates: [],
      }),
      MatchmakingInfoString_s: '',
      CustomMatchKey_s: '',
      PlaylistData_j: JSON.stringify({
        PlaylistData: {
          playlistName: 'Playlist_DefaultSquad',
          tournamentId: '',
          eventWindowId: '',
          regionId: 'EU',
        },
      }),
      AthenaSquadFill_b: 'true',
      AllowJoinInProgress_b: 'false',
      LFGTime_s: '0001-01-01T00:00:00.000Z',
      PartyIsJoinedInProgress_b: 'false',
      GameSessionKey_s: '',
      RawSquadAssignments_j: '',
      PrivacySettings_j: JSON.stringify({
        PrivacySettings: {
          partyType: this.Party.config.privacy.partyType,
          partyInviteRestriction: this.Party.config.privacy.inviteRestriction,
          bOnlyLeaderFriendsCanJoin: this.Party.config.privacy.onlyLeaderFriendsCanJoin,
        },
      }),
      PlatformSessions_j: JSON.stringify({
        PlatformSessions: [],
      }),
    };

    if (meta) this.update(meta, true);
    this.updateSquadAssignments();
  }

  updateSquadAssignments() {
    const assignments = [];
    let i = 0;
    assignments.push({
      memberId: this.Party.Client.account.id,
      absoluteMemberIdx: 0,
    });
    this.Party.members.forEach((m) => {
      if (m.id !== this.Party.Client.account.id) {
        i += 1;
        assignments.push({
          memberId: m.id,
          absoluteMemberIdx: i,
        });
      }
    });
    return this.set('RawSquadAssignments_j', {
      RawSquadAssignments: assignments,
    });
  }
}

module.exports = PartyMeta;
