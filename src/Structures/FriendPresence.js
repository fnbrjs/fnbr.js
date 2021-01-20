/* eslint-disable max-len */

/**
 * Represents the presence of a friend
 */
class FriendPresence {
  /**
   * @param {Object} client The main client
   * @param {Object} data The presence's data
   * @param {string} fromId The id of friend this presence belongs to
   */
  constructor(client, data, fromId) {
    Object.defineProperty(this, 'Client', { value: client });

    /**
     * The friend this presence belongs to
     * @type {string}
     */
    this.friend = this.Client.friends.get(fromId);

    /**
     * The status of this friend presence
     * @type {string}
     * @example
     * console.log(friendPresence.status); // Battle Royale Lobby - 1 / 16
     */
    this.status = data.Status;

    /**
     * The date when this presence was recieved
     * @type {Date}
     */
    this.recievedAt = new Date();

    /**
     * Whether the friend is in Kairos (Party Hub) or not
     * @type {boolean}
     */
    this.isInKairos = data.bIsEmbedded || false;

    /**
     * Whether the friend is playing or not
     * @type {boolean}
     */
    this.isPlaying = data.bIsPlaying;

    /**
     * Whether the friend's party is joinable or not
     * @type {boolean}
     */
    this.isJoinable = data.bIsJoinable;

    /**
     * Whether the friend has voice support or not
     * @type {boolean}
     */
    this.hasVoiceSupport = data.bHasVoiceSupport;

    /**
     * The id of the game session the friend is currently in
     * @type {?string}
     */
    this.sessionId = data.SessionId || undefined;

    const kairosProfile = data.Properties && (data.Properties.KairosProfile_s
      ? JSON.parse(data.Properties.KairosProfile_s) : data.Properties.KairosProfile_j);

    /**
     * The Kairos avatar of this friend presence
     * @type {FPKairosAvatar}
     */
    this.avatar = {
      asset: kairosProfile && kairosProfile.avatar,
      background: kairosProfile && kairosProfile.avatarBackground,
    };

    /**
     * The rating of the friend's SaveTheWorld homebase
     * @type {?string}
     */
    this.homebaseRating = data.Properties && data.Properties.FortBasicInfo_j ? data.Properties.FortBasicInfo_j.homeBaseRating : undefined;

    /**
     * The subgame the friend is in
     * @type {?string}
     */
    this.subGame = data.Properties ? data.Properties.FortSubGame_i : undefined;

    /**
     * Whether the friend is in an unjoinable match or not
     * @type {?boolean}
     */
    this.isInUnjoinableMatch = data.Properties ? data.Properties.InUnjoinableMatch_b : undefined;

    /**
     * The friend's current selected playlist
     * @type {?string}
     */
    this.playlist = data.Properties ? data.Properties.GamePlaylistName_s : undefined;

    /**
     * The member count of the friend's party
     * @type {?number}
     */
    this.partySize = data.Properties && data.Properties.Event_PartySize_s ? parseInt(data.Properties.Event_PartySize_s, 10) : undefined;

    /**
     * The max members of the friend's party
     * @type {?number}
     */
    this.partyMaxSize = data.Properties && data.Properties.Event_PartyMaxSize_s ? parseInt(data.Properties.Event_PartyMaxSize_s, 10) : undefined;

    /**
     * The join key of the game session the friend is currently in (if the game session is joinable)
     * @type {?string}
     */
    this.gameSessionJoinKey = data.Properties ? data.Properties.GameSessionJoinKey_s : undefined;

    const serverPlayerCount = data.Properties && data.Properties.ServerPlayerCount_i ? parseInt(data.Properties.ServerPlayerCount_i, 10) : undefined;

    /**
     * The stats of the game the friend is currently in
     * @type {FPGameplayStats}
     */
    this.gameplayStats = {
      kills: undefined,
      fellToDeath: false,
      serverPlayerCount: undefined,
    };

    if (data.Properties && data.Properties.FortGameplayStats_j) {
      const gps = data.Properties.FortGameplayStats_j;

      this.gameplayStats = {
        kills: typeof gps.numKills === 'number' ? gps.numKills : undefined,
        fellToDeath: data.bFellToDeath || false,
        serverPlayerCount,
      };
    }

    /**
     * The data of the party this friend is currently in
     * @type {FPPartyData}
     */
    this.partyData = {
      id: undefined,
      isPrivate: undefined,
      memberCount: undefined,
      platform: undefined,
      buildId: undefined,
    };

    const party = data.Properties
      ? data.Properties[Object.keys(data.Properties).find((p) => /party\.joininfodata\.\d+_j/.test(p))] : undefined;

    if (party) {
      this.partyData = {
        id: party.partyId,
        isPrivate: party.bIsPrivate || false,
        memberCount: party.pc ? parseInt(party.pc, 10) : undefined,
        platform: party.sourcePlatform,
        buildId: party.buildId,
      };
    }

    console.log('----------------------------------------\n', data, this, '----------------------------------------');
  }
}

module.exports = FriendPresence;
