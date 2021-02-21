const Meta = require('../util/Meta');

/**
 * Represents the meta of a party
 * @extends {Meta}
 * @private
 */
class PartyMeta extends Meta {
  /**
   * @param {Party} party The party
   * @param {Object} meta The meta
   */
  constructor(party, meta) {
    super();

    Object.defineProperty(this, 'party', { value: party });

    /**
     * The schema
     * @type {Object}
     */
    this.schema = {
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
          partyType: this.party.config.privacy.partyType,
          partyInviteRestriction: this.party.config.privacy.inviteRestriction,
          bOnlyLeaderFriendsCanJoin: this.party.config.privacy.onlyLeaderFriendsCanJoin,
        },
      }),
      'Default:PlatformSessions_j': JSON.stringify({
        PlatformSessions: [],
      }),
      'VoiceChat:implementation_s': 'VivoxVoiceChat',
    };

    if (meta) this.update(meta, true);
    this.updateSquadAssignments();
  }

  /**
   * Updates the party members' positions
   * @returns {Object}
   */
  updateSquadAssignments() {
    const assignments = [];
    let i = 0;
    assignments.push({
      memberId: this.party.client.user.id,
      absoluteMemberIdx: 0,
    });
    this.party.members.forEach((m) => {
      if (m.id !== this.party.client.user.id) {
        i += 1;
        assignments.push({
          memberId: m.id,
          absoluteMemberIdx: i,
        });
      }
    });
    return this.set('Default:RawSquadAssignments_j', {
      RawSquadAssignments: assignments,
    });
  }
}

module.exports = PartyMeta;
