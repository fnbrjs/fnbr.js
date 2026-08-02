import Base from '../../Base';
import type Client from '../../Client';
import type Friend from './Friend';
import type {
  PresenceGameplayStats, Platform, PresenceOnlineType,
  EOSPresencePerNs,
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
   * The friend's online type
   */
  public onlineType: PresenceOnlineType;

  /**
   * The platform the friend is currently playing on
   */
  public platform: Platform;

  /**
   * Whether the friend is playing
   */
  public isPlaying: boolean;

  /**
   * Whether the friend's party is joinable
   */
  public isJoinable: boolean;

  /**
   * Whether the friend has voice support
   * @deprecated This property is no longer used and will be removed in a future version
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
   * @deprecated This property is no longer used and will be removed in a future version
   */
  public gameSessionJoinKey?: string;

  /**
   * The stats of the game the friend is currently in
   */
  public gameplayStats?: PresenceGameplayStats;

  /**
   * @param client The main client
   * @param data The presence data
   * @param friend The friend this presence belongs to
   */
  constructor(client: Client, data: EOSPresencePerNs, friend: Friend, onlineType: PresenceOnlineType) {
    super(client);

    this.friend = friend;
    this.status = data.activity.value;
    this.receivedAt = new Date();
    this.onlineType = onlineType;
    this.platform = data.props.EOS_Platform;

    this.isPlaying = typeof data.props.IsInZone === 'string' && FriendPresence.parsePropsValue(data.props.IsInZone);
    this.isJoinable = typeof data.props['party.joininfodata.286331153'] === 'string'
      ? !FriendPresence.parsePropsValue<{ bIsPrivate?: boolean }>(data.props['party.joininfodata.286331153'])?.bIsPrivate
      : false;

    this.sessionId = typeof data.props.SessionIdAttributeKey === 'string'
      ? FriendPresence.parsePropsValue(data.props.SessionIdAttributeKey)
      : undefined;

    this.homebaseRating = typeof data.props.FortBasicInfo === 'string'
      ? FriendPresence.parsePropsValue<{ homeBaseRating: number }>(data.props.FortBasicInfo)?.homeBaseRating
      : undefined;

    this.subGame = typeof data.props.FortSubGame === 'string'
      ? FriendPresence.parsePropsValue(data.props.FortSubGame)
      : undefined;

    this.isInUnjoinableMatch = typeof data.props.InUnjoinableMatch === 'string'
      ? FriendPresence.parsePropsValue(data.props.InUnjoinableMatch)
      : undefined;

    this.playlist = typeof data.props.GamePlaylistName === 'string'
      ? FriendPresence.parsePropsValue(data.props.GamePlaylistName)
      : undefined;

    this.partySize = typeof data.props.FortPartySize === 'string'
      ? FriendPresence.parsePropsValue(data.props.FortPartySize)
      : undefined;

    this.partyMaxSize = typeof data.props.Event_PartyMaxSize === 'string'
      ? FriendPresence.parsePropsValue(data.props.Event_PartyMaxSize)
      : undefined;

    const gameplayStats = typeof data.props.FortGameplayStats === 'string'
      ? FriendPresence.parsePropsValue<{
        state: string; playlist: string; numKills: number; bFellToDeath: boolean;
      }>(data.props.FortGameplayStats)
      : undefined;

    this.gameplayStats = gameplayStats && {
      kills: gameplayStats.numKills,
      fellToDeath: gameplayStats.bFellToDeath,
      playersAlive: typeof data.props.Event_PlayersAlive === 'string'
        ? FriendPresence.parsePropsValue<number>(data.props.Event_PlayersAlive)
        : undefined,
    };
  }

  public static parsePropsValue<T extends any>(value: string): T {
    const type = value[0];
    const val = value.slice(1);

    switch (type) {
      case 'b':
        return (val === 'true') as T;
      case 'i':
        return parseInt(val, 10) as T;
      case 'm':
        return JSON.parse(val) as T;
      case 's':
        return val as T;
      default:
        return val as T;
    }
  }

  public static stringifyPropsValue(value: any): string {
    switch (typeof value) {
      case 'boolean':
        return `b${value}`;
      case 'number':
        return `i${value}`;
      case 'object':
        return `m${JSON.stringify(value)}`;
      case 'string':
        return `s${value}`;
      default:
        return `s${value}`;
    }
  }
}

export default FriendPresence;
