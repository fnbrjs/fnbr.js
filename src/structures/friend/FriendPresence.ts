import Base from '../../Base';
import type Client from '../../Client';
import type Friend from './Friend';
import type {
  FriendPresenceData, PresenceGameplayStats, Platform, PresenceOnlineType,
} from '../../../resources/structs';

/**
 * Represents a friend's presence
 */
class FriendPresence extends Base {
  /**
   * The friend this presence belongs to
   */
  public friend: Friend;

  /**
   * The status of the friend (eg. "Battle Royale Lobby - 1 / 16")
   */
  public status?: string;

  /**
   * The date when this presence was recieved
   */
  public receivedAt: Date;

  /**
   * Whether the friend is playing
   */
  public isPlaying?: boolean;

  /**
   * Whether the friend's party is joinable
   */
  public isJoinable?: boolean;

  /**
   * Whether the friend has voice support
   */
  public hasVoiceSupport?: boolean;

  /**
   * The id of the game session the friend is currently in
   */
  public sessionId?: string;

  /**
   * The rating of the friend's SaveTheWorld homebase
   */
  public homebaseRating?: number;

  /**
   * The subgame the friend is in
   */
  public subGame?: number;

  /**
   * Whether the friend is in an unjoinable match or not
   */
  public isInUnjoinableMatch?: boolean;

  /**
   * The friend's current selected playlist
   */
  public playlist?: string;

  /**
   * The member count of the friend's party
   */
  public partySize?: number;

  /**
   * The max members of the friend's party
   */
  public partyMaxSize?: number;

  /**
   * The join key of the game session the friend is currently in (if the game session is joinable)
   */
  public gameSessionJoinKey?: string;

  /**
   * The stats of the game the friend is currently in
   */
  public gameplayStats?: PresenceGameplayStats;

  /**
   * The platform the friend is currently playing on
   */
  public platform?: Platform;

  /**
   * The friend's online type
   */
  public onlineType: PresenceOnlineType;

  /**
   * @param client The main client
   * @param data The presence data
   * @param friend The friend this presence belongs to
   */
  constructor(client: Client, data: FriendPresenceData, friend: Friend, show: PresenceOnlineType, from: string) {
    super(client);

    this.friend = friend;
    this.status = data.Status;
    this.onlineType = show;
    this.platform = from.match(/(?<=\/.+?:.+?:).+(?=::)/g)?.[0] as Platform | undefined;
    this.receivedAt = new Date();
    this.isPlaying = data.bIsPlaying || false;
    this.isJoinable = data.bIsJoinable || false;
    this.hasVoiceSupport = data.bHasVoiceSupport || false;
    this.sessionId = data.SessionId;
    this.homebaseRating = data.Properties && data.Properties.FortBasicInfo_j ? data.Properties.FortBasicInfo_j.homeBaseRating : undefined;
    this.subGame = data.Properties ? data.Properties.FortSubGame_i : undefined;
    this.isInUnjoinableMatch = data.Properties ? data.Properties.InUnjoinableMatch_b : false;
    this.playlist = data.Properties ? data.Properties.GamePlaylistName_s : undefined;
    this.partySize = data.Properties && data.Properties.Event_PartySize_s ? parseInt(data.Properties.Event_PartySize_s, 10) : undefined;
    this.partyMaxSize = data.Properties && data.Properties.Event_PartyMaxSize_s
      ? parseInt(data.Properties.Event_PartyMaxSize_s, 10) : undefined;
    this.gameSessionJoinKey = data.Properties ? data.Properties.GameSessionJoinKey_s : undefined;

    const serverPlayerCount = data.Properties && data.Properties.ServerPlayerCount_i
      ? parseInt(data.Properties.ServerPlayerCount_i, 10) : undefined;
    this.gameplayStats = undefined;

    if (data.Properties && data.Properties.FortGameplayStats_j) {
      const gps = data.Properties.FortGameplayStats_j;

      this.gameplayStats = {
        kills: typeof gps.numKills === 'number' ? gps.numKills : undefined,
        fellToDeath: gps.bFellToDeath,
        serverPlayerCount,
      };
    }
  }
}

export default FriendPresence;
