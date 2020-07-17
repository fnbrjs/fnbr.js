/* eslint-disable max-len */

/**
 * A presence of a friend recieved via XMPP
 */
class FriendPresence {
  /**
   * @param {Object} client main client
   * @param {Object} data presence data
   * @param {String} fromId id of friend that sent this presence
   */
  constructor(client, data, fromId) {
    Object.defineProperty(this, 'Client', { value: client });
    Object.defineProperty(this, 'data', { value: data });

    /**
     * Friend this presence belongs to
     */
    this.friend = this.Client.friends.get(fromId);

    /**
     * The friends status eg "Battle Royale Lobby - 1 / 16"
     */
    this.status = data.Status;

    /**
     * When this presence was recieved
     */
    this.recievedAt = new Date();

    /**
     * If the friend is in kairos (fortnite mobile)
     */
    this.isInKairos = data.bIsEmbedded || false;

    /**
     * If the friend is playing
     */
    this.isPlaying = data.bIsPlaying;

    /**
     * If the friend is joinable
     */
    this.isJoinable = data.bIsJoinable;

    /**
     * If the friend has voice support
     */
    this.hasVoiceSupport = data.bHasVoiceSupport;

    /**
     * The id of the game session the friend is currently in
     */
    this.sessionId = data.SessionId || undefined;

    /**
     * The friends avatar
     */
    this.avatar = {
      asset: data.Properties && data.Properties.KairosProfile_j ? data.Properties.KairosProfile_j.avatar : undefined,
      background: data.Properties && data.Properties.KairosProfile_j ? data.Properties.KairosProfile_j.avatarBackground : undefined,
    };

    /**
     * The rating of the friends SaveTheWorld homebase
     */
    this.homebaseRating = data.Properties && data.Properties.FortBasicInfo_j ? data.Properties.FortBasicInfo_j.homeBaseRating : undefined;

    /**
     * The subgame the friend is in
     */
    this.subGame = data.Properties ? data.Properties.FortSubGame_i : undefined;

    /**
     * If the friend is in an unjoinable match
     */
    this.isInUnjoinableMatch = data.Properties ? data.Properties.InUnjoinableMatch_b : undefined;

    /**
     * The current playlist the friend has selected
     */
    this.playlist = data.Properties ? data.Properties.GamePlaylistName_s : undefined;

    /**
     * How many members the friends party has
     */
    this.partySize = data.Properties && data.Properties.Event_PartySize_s ? parseInt(data.Properties.Event_PartySize_s, 10) : undefined;

    /**
     * How many max members the friends party has
     */
    this.partyMaxSize = data.Properties && data.Properties.Event_PartyMaxSize_s ? parseInt(data.Properties.Event_PartyMaxSize_s, 10) : undefined;

    /**
     * How many max members the friends party has
     */
    this.gameSessionJoinKey = data.Properties ? data.Properties.GameSessionJoinKey_s : undefined;

    const serverPlayerCount = data.Properties && data.Properties.ServerPlayerCount_i ? parseInt(data.Properties.ServerPlayerCount_i, 10) : undefined;

    /**
     * If the friend is in an unjoinable match
     */
    this.isInUnjoinableMatch = data.Properties ? data.Properties.InUnjoinableMatch_b : undefined;

    /**
     * Stats of the game the client is currently in
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
     * Data of the party this friend is currently in
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
    console.log(this.partyData);
  }
}

module.exports = FriendPresence;
