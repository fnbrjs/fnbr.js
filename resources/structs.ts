/* eslint-disable camelcase */
import type { Collection } from '@discordjs/collection';
import type { RawAxiosRequestConfig } from 'axios';
import type { PathLike } from 'fs';
import type defaultPartyMeta from './defaultPartyMeta.json';
import type defaultPartyMemberMeta from './defaultPartyMemberMeta.json';
import type EpicgamesAPIError from '../src/exceptions/EpicgamesAPIError';
import type BlockedUser from '../src/structures/user/BlockedUser';
import type ClientParty from '../src/structures/party/ClientParty';
import type ClientPartyMember from '../src/structures/party/ClientPartyMember';
import type ClientUser from '../src/structures/user/ClientUser';
import type Friend from '../src/structures/friend/Friend';
import type FriendPresence from '../src/structures/friend/FriendPresence';
import type IncomingPendingFriend from '../src/structures/friend/IncomingPendingFriend';
import type OutgoingPendingFriend from '../src/structures/friend/OutgoingPendingFriend';
import type ReceivedPartyJoinRequest from '../src/structures/party/ReceivedPartyJoinRequest';
import type PartyMember from '../src/structures/party/PartyMember';
import type PartyMemberConfirmation from '../src/structures/party/PartyMemberConfirmation';
import type PartyMessage from '../src/structures/party/PartyMessage';
import type ReceivedPartyInvitation from '../src/structures/party/ReceivedPartyInvitation';
import type User from '../src/structures/user/User';
import type {
  EpicgamesOAuthData, STWMissionAlertData, STWMissionData, STWProfileLockerSlotData,
  STWTheaterData, TournamentWindowTemplateData,
} from './httpResponses';
import type ReceivedFriendMessage from '../src/structures/friend/ReceivedFriendMessage';
import type STWSurvivor from '../src/structures/stw/STWSurvivor';
import type { AuthSessionStoreKey } from './enums';
import type FortniteAuthSession from '../src/auth/FortniteAuthSession';
import type LauncherAuthSession from '../src/auth/LauncherAuthSession';
import type FortniteClientCredentialsAuthSession from '../src/auth/FortniteClientCredentialsAuthSession';

export type PartyMemberSchema = Partial<typeof defaultPartyMemberMeta>;
export type PartySchema = Partial<typeof defaultPartyMeta> & {
  'urn:epic:cfg:presence-perm_s'?: string;
  'urn:epic:cfg:accepting-members_b'?: string;
  'urn:epic:cfg:invite-perm_s'?: string;
  'urn:epic:cfg:not-accepting-members'?: string;
  'urn:epic:cfg:not-accepting-members-reason_i'?: string;
};

export type Schema = Record<string, string | undefined>;

export type Language = 'de' | 'ru' | 'ko' | 'zh-hant' | 'pt-br' | 'en'
| 'it' | 'fr' | 'zh-cn' | 'es' | 'ar' | 'ja' | 'pl' | 'es-419' | 'tr';

export type StringFunction = () => string;

export type StringFunctionAsync = () => Promise<string>;

export interface DeviceAuth {
  /**
   * The device auth's account ID
   */
  accountId: string;

  /**
   * The device auth's device ID (that does not mean it can only be used on a single device)
   */
  deviceId: string;

  /**
   * The device auth's secret
   */
  secret: string;
}

export interface DeviceAuthWithSnakeCaseSupport extends DeviceAuth {
  /**
   * The device auth's account ID
   */
  account_id?: string;

  /**
   * The device auth's device ID (that does not mean it can only be used on a single device)
   */
  device_id?: string;
}

export type DeviceAuthFunction = () => DeviceAuth;

export type DeviceAuthFunctionAsync = () => Promise<DeviceAuth>;

export type DeviceAuthResolveable = DeviceAuth | PathLike | DeviceAuthFunction | DeviceAuthFunctionAsync;

export type AuthStringResolveable = string | PathLike | StringFunction | StringFunctionAsync;

export type Platform = 'WIN' | 'MAC' | 'PSN' | 'XBL' | 'SWT' | 'IOS' | 'AND' | 'PS5' | 'XSX';

export type AuthClient = 'fortnitePCGameClient' | 'fortniteIOSGameClient' | 'fortniteAndroidGameClient'
| 'fortniteSwitchGameClient' | 'fortniteCNGameClient' | 'launcherAppClient2' | 'Diesel - Dauntless';

export interface RefreshTokenData {
  /**
   * The refresh token
   */
  token: string;

  /**
   * The refresh token's expiration time in seconds
   */
  expiresIn: number;

  /**
   * The refresh token's expiration date
   */
  expiresAt: string;

  /**
   * The ID of the account the refresh token belongs to
   */
  accountId: string;

  /**
   * The display name of the account the refresh token belongs to
   */
  displayName: string;

  /**
   * The refresh token's client ID (will always be the ID of launcherAppClient2)
   */
  clientId: string;
}

export interface CacheSetting {
  /**
   * How long the data should stay in the cache until it is considered sweepable (in seconds, 0 for no cache, Infinity for infinite)
   */
  maxLifetime: number;

  /**
   * How frequently to remove cached data that is older than the lifetime (in seconds, 0 for never)
   */
  sweepInterval: number;
}

export interface CacheSettings {
  /**
   * The presence cache settings
   */
  presences?: CacheSetting;

  /**
   * The user cache settings
   */
  users?: CacheSetting;
}

export interface AuthOptions {
  /**
   * A device auth object, a function that returns a device auth object or a path to a file containing a device auth object
   */
  deviceAuth?: DeviceAuthResolveable;

  /**
   * An exchange code, a function that returns an exchange code or a path to a file containing an exchange code
   */
  exchangeCode?: AuthStringResolveable;

  /**
   * An authorization code, a function that returns an authorization code or a path to a file containing an authorization code
   */
  authorizationCode?: AuthStringResolveable;

  /**
   * A refresh token, a function that returns a refresh token or a path to a file containing a refresh token
   */
  refreshToken?: AuthStringResolveable;

  /**
   * A launcher refresh token, a function that returns a launcher refresh token or a path to a file containing a launcher refresh token
   */
  launcherRefreshToken?: AuthStringResolveable;

  /**
   * Whether the client should check whether the EULA has been accepted.
   * Do not modify this unless you know what you're doing
   */
  checkEULA?: boolean;

  /**
   * Whether the client should kill other active Fortnite auth sessions on startup
   */
  killOtherTokens?: boolean;

  /**
   * Whether the client should create a launcher auth session and keep it alive.
   * The launcher auth session can be accessed via `client.auth.auths.get('launcher')`
   */
  createLauncherSession?: boolean;

  /**
   * The Fortnite auth client (eg. 'fortnitePCGameClient' or 'fortniteAndroidGameClient')
   */
  authClient?: AuthClient;
}

export interface PartyPrivacy {
  partyType: 'Public' | 'FriendsOnly' | 'Private';
  inviteRestriction: 'AnyMember' | 'LeaderOnly';
  onlyLeaderFriendsCanJoin: boolean;
  presencePermission: 'Anyone' | 'Leader' | 'Noone';
  invitePermission: 'Anyone' | 'AnyMember' | 'Leader';
  acceptingMembers: boolean;
}

export interface PartyOptions {
  joinConfirmation?: boolean;
  joinability?: 'OPEN' | 'INVITE_AND_FORMER';
  discoverability?: 'ALL' | 'INVITED_ONLY';
  privacy?: PartyPrivacy;
  maxSize?: number;
  intentionTtl?: number;
  inviteTtl?: number;
  chatEnabled?: boolean;
}

export interface PartyConfig {
  type: 'DEFAULT';
  joinability: 'OPEN' | 'INVITE_AND_FORMER';
  discoverability: 'ALL' | 'INVITED_ONLY';
  subType: 'default';
  maxSize: number;
  inviteTtl: number;
  intentionTtl: number;
  joinConfirmation: boolean;
  privacy: PartyPrivacy;
}

export type PresenceOnlineType = 'online' | 'away' | 'chat' | 'dnd' | 'xa';

export type StatsPlaylistType = 'other' | 'solo' | 'duo' | 'squad' | 'ltm';

export interface ClientConfig {
  /**
   * Whether the party member meta (outfit, emote, etc) should be saved so they are kept when joining a new party
   */
  savePartyMemberMeta: boolean;

  /**
   * Additional axios request options
   */
  http: RawAxiosRequestConfig;

  /**
   * Debug function used for general debugging purposes
   */
  debug?: (message: string) => void;

  /**
   * Debug function used for http requests
   */
  httpDebug?: (message: string) => void;

  /**
   * Debug function used for incoming and outgoing xmpp xml payloads
   */
  xmppDebug?: (message: string) => void;

  /**
   * Default friend presence of the bot (eg. "Playing Battle Royale")
   */
  defaultStatus?: string;

  /**
   * Default online type of the bot (eg "away"). None for online
   */
  defaultOnlineType: PresenceOnlineType;

  /**
   * The client's platform (WIN by default)
   */
  platform: Platform;

  /**
   * The client's default party member meta (can be used to set a custom default skin, etc)
   */
  defaultPartyMemberMeta: Schema;

  /**
   * Custom keep alive interval for the xmpp websocket connection.
   * You should lower this value if the client randomly reconnects
   */
  xmppKeepAliveInterval: number;

  /**
   * The maximum amount of times the client should try to reconnect to XMPP before giving up
   */
  xmppMaxConnectionRetries: number;

  /**
   * Settings that affect the way the client caches certain data
   */
  cacheSettings: CacheSettings;

  /**
   * Client authentication options. By default the client will ask you for an authorization code
   */
  auth: AuthOptions;

  /**
   * Default config used for creating parties
   */
  partyConfig: PartyOptions;

  /**
   * Whether the client should create a party on startup
   */
  createParty: boolean;

  /**
   * Whether a new party should be force created on start (even if the client is already member of a party)
   */
  forceNewParty: boolean;

  /**
   * Whether to completely disable all party related functionality
   */
  disablePartyService: boolean;

  /**
   * Whether the client should connect via XMPP.
   * NOTE: If you disable this, almost all features related to friend caching will no longer work.
   * Do not disable this unless you know what you're doing
   */
  connectToXMPP: boolean;

  /**
   * Whether the client should fetch all friends on startup.
   * NOTE: If you disable this, almost all features related to friend caching will no longer work.
   * Do not disable this unless you know what you're doing
   */
  fetchFriends: boolean;

  /**
   * Timeout (in ms) for how long a friend is considered online after the last presence was received.
   * Note: Usually the client will receive a presence when the friend goes offline, when that does not happen, this timeout will be used
   */
  friendOfflineTimeout: number;

  /**
   * How many times to retry on HTTP 5xx errors
   */
  restRetryLimit: number;

  /**
   * Whether the client should handle rate limits (429 status code responses)
   */
  handleRatelimits: boolean;

  /**
   * The party build id (does not change very often, don't change this unless you know what you're doing)
   */
  partyBuildId: string;

  /**
   * Whether the client should restart if a refresh token is invalid.
   * Refresh tokens can be invalid if you logged in with another client on the same account.
   * By default, this is set to false because two clients attempting to log into one account could result in an endless loop
   */
  restartOnInvalidRefresh: boolean;

  /**
   * The default language for all http requests.
   * Will be overwritten by a method's language parameter
   */
  language: Language;

  /**
   * Amount of time (in ms) to wait after the initial xmpp connection before emitting friend:online events
   */
  friendOnlineConnectionTimeout: number;

  /**
   * A custom parser for resolving the stats playlist type (ie. "solo", "duo", "ltm").
   * Can be useful if you want to use data in the game files to determine the stats playlist type
   */
  statsPlaylistTypeParser?: (playlistId: string) => StatsPlaylistType;
}

export interface MatchMeta {
  location?: 'PreLobby' | 'InGame' | 'ReturningToFrontEnd';
  hasPreloadedAthena?: boolean;
  isSpectatable?: boolean;
  playerCount?: number;
  matchStartedAt?: Date;
}

export interface ClientOptions extends Partial<ClientConfig> {}

export interface ClientEvents {
  /**
   * Emitted when the client is ready
   */
  ready: () => void;

  /**
   * Emitted when the client got shut down
   */
  disconnected: () => void;

  /**
   * Emitted when a device auth got created
   * @param deviceAuth The device auth
   */
  'deviceauth:created': (deviceAuth: DeviceAuth) => void;

  /**
   * Emitted when a refresh token got created
   * @param refreshTokenData The refresh token data
   */
  'refreshtoken:created': (refreshTokenData: RefreshTokenData) => void;

  /**
   * Emitted when the client received a friend whisper message
   * @param message The received friend whipser message
   */
  'friend:message': (message: ReceivedFriendMessage) => void;

  /**
   * Emitted when the client recieved a friend presence
   * @param before The friend's previous presence
   * @param after The friend's current presence
   */
  'friend:presence': (before: FriendPresence | undefined, after: FriendPresence) => void;

  /**
   * Emitted when a friend becomes online
   * @param friend The friend that became online
   */
  'friend:online': (friend: Friend) => void;

  /**
   * Emitted when a friend goes offline
   * @param friend The friend that went offline
   */
  'friend:offline': (friend: Friend) => void;

  /**
   * Emitted when a member in the client's party sent a message in the party chat
   * @param message The received message
   */
  'party:member:message': (message: PartyMessage) => void;

  /**
   * Emitted when a user got added to the client's friend list
   * @param friend The new friend
   */
  'friend:added': (friend: Friend) => void;

  /**
   * Emitted when the client recieved a friendship request
   * @param pendingFriend The pending friend
   */
  'friend:request': (pendingFriend: IncomingPendingFriend) => void;

  /**
   * Emitted when the client sent a friendship request
   * @param pendingFriend The pending friend
   */
  'friend:request:sent': (pendingFriend: OutgoingPendingFriend) => void;

  /**
   * Emitted when the client aborted an outgoing friendship request or when someone aborted an incoming friendship request
   * @param pendingFriend The previously pending friend
   */
  'friend:request:aborted': (pendingFriend: IncomingPendingFriend | OutgoingPendingFriend) => void;

  /**
   * Emitted when the client declined an incoming friendship request or when someone declined an outgoing friendship request
   * @param pendingFriend The previously pending friend
   */
  'friend:request:declined': (pendingFriend: IncomingPendingFriend | OutgoingPendingFriend) => void;

  /**
   * Emitted when a user got removed from the client's friend list
   * @param friend The friend
   */
  'friend:removed': (friend: Friend) => void;

  /**
   * Emitted when a user got added to the client's block list
   * @param blockedUser The user that got blocked
   */
  'user:blocked': (blockedUser: BlockedUser) => void;

  /**
   * Emitted when a user got removed from the client's block list
   * @param blockedUser The user that got unblocked
   */
  'user:unblocked': (blockedUser: BlockedUser) => void;

  /**
   * Emitted when an error occures while processing an incoming xmpp message
   * @param error The error that occurred
   */
  'xmpp:message:error': (error: Error) => void;

  /**
   * Emitted when an error occures while processing an incoming xmpp presence
   * @param error The error that occurred
   */
  'xmpp:presence:error': (error: Error) => void;

  /**
   * Emitted when an error occures while processing an incoming xmpp chat message (either a friend or party message)
   * @param error The error that occurred
   */
  'xmpp:chat:error': (error: Error) => void;

  /**
   * Emitted when the client recieved a party invitation
   * @param invitation The received party invitation
   */
  'party:invite': (invitation: ReceivedPartyInvitation) => void;

  /**
   * Emitted when a party member joined the client party
   * @param member The member who joined the client's party
   */
  'party:member:joined': (member: PartyMember | ClientPartyMember) => void;

  /**
   * Emitted when a party member got updated
   * @param member The updated party member
   */
  'party:member:updated': (member: PartyMember | ClientPartyMember) => void;

  /**
   * Emitted when a party member left the party
   * @param member The party member
   */
  'party:member:left': (member: PartyMember) => void;

  /**
   * Emitted when a party member expired
   * @param member The party member
   */
  'party:member:expired': (member: PartyMember) => void;

  /**
   * Emitted when a party member gets kicked
   * @param member The party member
   */
  'party:member:kicked': (member: PartyMember) => void;

  /**
   * Emitted when a party member disconnected
   * @param member The party member
   */
  'party:member:disconnected': (member: PartyMember) => void;

  /**
   * Emitted when a party member gets promoted
   * @param member The party member
   */
  'party:member:promoted': (member: PartyMember | ClientPartyMember) => void;

  /**
   * Emitted when the client's party gets updated
   * @param party The party which got updated
   */
  'party:updated': (party: ClientParty) => void;

  /**
   * Emitted when a party member requires confirmation
   * @param confirmation The pending party member confirmation
   */
  'party:member:confirmation': (confirmation: PartyMemberConfirmation) => void;

  /**
   * Emitted when a friend requests to join the bots party
   * @param request The recieved join request
   */
  'party:joinrequest': (request: ReceivedPartyJoinRequest) => void;

  /**
   * Emitted when a party member updated their outfit
   * @param member The member
   * @param value The new outfit
   * @param previousValue The previous outfit
   */
  'party:member:outfit:updated': (member: PartyMember | ClientPartyMember, value?: string, previousValue?: string) => void;

  /**
   * Emitted when a party member updated their emote
   * @param member The member
   * @param value The new emote
   * @param previousValue The previous emote
   */
  'party:member:emote:updated': (member: PartyMember | ClientPartyMember, value?: string, previousValue?: string) => void;

  /**
   * Emitted when a party member updated their backpack
   * @param member The member
   * @param value The new backpack
   * @param previousValue The previous backpack
   */
  'party:member:backpack:updated': (member: PartyMember | ClientPartyMember, value?: string, previousValue?: string) => void;

  /**
   * Emitted when a party member updated their pickaxe
   * @param member The member
   * @param value The new pickaxe
   * @param previousValue The previous pickaxe
   */
  'party:member:pickaxe:updated': (member: PartyMember | ClientPartyMember, value?: string, previousValue?: string) => void;

  /**
   * Emitted when a party member updated their readiness state
   * @param member The member
   * @param value The new readiness state
   * @param previousValue The previous readiness state
   */
  'party:member:readiness:updated': (member: PartyMember | ClientPartyMember, value?: boolean, previousValue?: boolean) => void;

  /**
   * Emitted when a party member updated their match state
   * @param member The member
   * @param value The new match state
   * @param previousValue The previous match state
   */
  'party:member:matchstate:updated': (member: PartyMember | ClientPartyMember, value?: MatchMeta, previousValue?: MatchMeta) => void;
}

export type AuthType = 'fortnite' | 'fortniteClientCredentials' | 'launcher';

export interface AuthResponse {
  response?: EpicgamesOAuthData;
  error?: EpicgamesAPIError | Error;
}

export interface ReauthResponse {
  response?: {
    success: boolean;
  };
  error?: EpicgamesAPIError;
}

export interface FriendConnection {
  name?: string;
}

export interface FriendConnections {
  epic?: FriendConnection;
  psn?: FriendConnection;
  nintendo?: FriendConnection;
}

export interface PresenceGameplayStats {
  kills?: number;
  fellToDeath?: boolean;
  serverPlayerCount?: number;
}

export type PendingFriendDirection = 'INCOMING' | 'OUTGOING';

export interface StatsPlaylistTypeData {
  score: number;
  scorePerMin: number;
  scorePerMatch: number;
  wins: number;
  top3: number;
  top5: number;
  top6: number;
  top10: number;
  top12: number;
  top25: number;
  kills: number;
  killsPerMin: number;
  killsPerMatch: number;
  deaths: number;
  kd: number;
  matches: number;
  winRate: number;
  minutesPlayed: number;
  playersOutlived: number;
  lastModified?: Date;
}

export interface StatsInputTypeData {
  overall: StatsPlaylistTypeData;
  solo: StatsPlaylistTypeData;
  duo: StatsPlaylistTypeData;
  squad: StatsPlaylistTypeData;
  ltm: StatsPlaylistTypeData;
}

export interface StatsData {
  all: StatsInputTypeData;
  keyboardmouse: StatsInputTypeData;
  gamepad: StatsInputTypeData;
  touch: StatsInputTypeData;
}

export interface NewsMOTD {
  entryType: string;
  image: string;
  tileImage: string;
  videoMute: boolean;
  hidden: boolean;
  tabTitleOverride: string;
  _type: string;
  title: string;
  body: string;
  offerAction: string;
  videoLoop: boolean;
  videoStreamingEnabled: boolean;
  sortingPriority: number;
  buttonTextOverride?: string;
  offerId?: string;
  id: string;
  videoAutoplay: boolean;
  videoFullscreen: boolean;
  spotlight: boolean;
  videoUID?: string;
  videoVideoString?: string;
  playlistId?: string;
}

export interface NewsMessageData {
  image: string;
  hidden: boolean;
  _type: string;
  adspace: string;
  title: string;
  body: string;
  spotlight: boolean;
}

export interface LightswitchLauncherInfo {
  appName: string;
  catalogItemId: string;
  namespace: string;
}

export interface LightswitchData {
  serviceInstanceId: string;
  status: string;
  message: string;
  maintenanceUri?: string;
  overrideCatalogIds: string[];
  allowedActions: string[];
  banned: boolean;
  launcherInfoDTO: LightswitchLauncherInfo;
}

export interface EpicgamesServerStatusData {
  page: {
    id: string;
    name: string;
    url: string;
    time_zone: string;
    updated_at: string;
  };
  components: {
    id: string;
    name: string;
    status: string;
    created_at: Date;
    updated_at: Date;
    position: number;
    description?: any;
    showcase: boolean;
    start_date: string;
    group_id: string;
    page_id: string;
    group: boolean;
    only_show_if_degraded: boolean;
    components: string[];
  }[];
  incidents: any[];
  scheduled_maintenances: any[];
  status: {
    indicator: string;
    description: string;
  };
}

export interface EpicgamesServerStatusIncidentUpdate {
  id: string;
  body: string;
  createdAt: Date;
  displayAt: Date;
  status: string;
  updatedAt: Date;
}

export interface MessageData {
  content: string;
  author: Friend | PartyMember | ClientPartyMember | ClientUser;
  id: string;
  sentAt?: Date;
}

export interface FriendMessageData extends MessageData {
  author: Friend | ClientUser;
}

export interface PartyMessageData extends MessageData {
  author: PartyMember | ClientPartyMember;
  party: ClientParty;
}

export interface PendingFriendData {
  accountId: string;
  created: string;
  favorite: boolean;
  displayName: string;
}

export interface ExternalAuth {
  accountId: string;
  type: string;
  externalAuthId: string;
  externalAuthIdType: string;
  externalDisplayName?: string;
  authIds: {
    id: string;
    type: string;
  }[];
}

export interface ExternalAuths {
  github?: ExternalAuth;
  twitch?: ExternalAuth;
  steam?: ExternalAuth;
  psn?: ExternalAuth;
  xbl?: ExternalAuth;
  nintendo?: ExternalAuth;
}

export interface UserData {
  id: string;
  displayName?: string;
  externalAuths?: ExternalAuths;
}

export interface ClientUserData extends UserData {
  name: string;
  email: string;
  failedLoginAttempts: number;
  lastLogin: string;
  numberOfDisplayNameChanges: number;
  ageGroup: string;
  headless: boolean;
  country: string;
  lastName: string;
  phoneNumber: string;
  preferredLanguage: string;
  lastDisplayNameChange: string;
  canUpdateDisplayName: boolean;
  tfaEnabled: boolean;
  emailVerified: boolean;
  minorVerified: boolean;
  minorExpected: boolean;
  minorStatus: string;
}

export interface CreatorCodeData {
  slug: string;
  owner: User;
  status: 'ACTIVE' | 'DISABLED';
  verified: boolean;
}

export interface FriendData extends UserData {
  created: string;
  favorite: boolean;
  displayName?: string;
  connections?: FriendConnections;
  mutual?: number;
  alias: string;
  note: string;
}

export interface FriendPresenceData {
  Status?: string;
  bIsPlaying?: boolean;
  bIsJoinable?: boolean;
  bHasVoiceSupport?: boolean;
  SessionId?: string;
  ProductName?: string;
  Properties?: {
    FortBasicInfo_j?: {
      homeBaseRating?: number;
    };
    FortLFG_I?: string;
    FortPartySize_i?: number;
    FortSubGame_i?: number;
    InUnjoinableMatch_b?: boolean;
    FortGameplayStats_j?: {
      state: string;
      playlist: string;
      numKills: number;
      bFellToDeath: boolean;
    };
    'party.joininfodata.286331153_j'?: {
      bIsPrivate?: boolean;
    };
    GamePlaylistName_s?: string;
    Event_PlayersAlive_s?: string;
    Event_PartySize_s?: string;
    Event_PartyMaxSize_s?: string;
    GameSessionJoinKey_s?: string;
    ServerPlayerCount_i?: string;
  };
}

export interface PartyMemberData {
  id: string;
  account_id: string;
  account_dn?: string;
  meta: Schema;
  revision: number;
  updated_at: string;
  joined_at: string;
  role: string;
}

export interface PartyMemberUpdateData {
  account_id: string;
  account_dn?: string;
  revision: number;
  member_state_updated: Schema;
  member_state_removed: string[];
}

export interface PartyData {
  id: string;
  created_at: string;
  updated_at: string;
  config: {
    type: string;
    joinability: string;
    discoverability: string;
    sub_type: string;
    max_size: number;
    invite_ttl: number;
    join_confirmation: boolean;
    intention_ttl: number;
  };
  members: PartyMemberData[];
  meta: PartySchema;
  invites: any[];
  revision: number;
}

export interface PartyUpdateData {
  revision: number;
  party_state_updated: Schema;
  party_state_removed: string[];
  party_privacy_type: 'OPEN' | 'INVITE_AND_FORMER';
  max_number_of_members: number;
  party_sub_type: 'default';
  party_type: 'DEFAULT';
  invite_ttl_seconds: number;
  discoverability: 'ALL' | 'INVITED_ONLY';
}

export interface Playlist {
  playlistName: string;
  tournamentId?: string;
  eventWindowId?: string;
  linkId?: {
    mnemonic?: string;
    version?: number;
  };
}

export interface CosmeticVariant {
  channel: string;
  variant: string;
  dE?: number;
}

export interface CosmeticVariantMeta {
  i: {
    v: string;
    c: string;
    dE: number;
  }[];
}

export interface CosmeticsVariantMeta {
  athenaCharacter?: CosmeticVariantMeta;
  athenaBackpack?: CosmeticVariantMeta;
  athenaPickaxe?: CosmeticVariantMeta;
  athenaSkyDiveContrail?: CosmeticVariantMeta;
}

export type CosmeticEnlightment = [number, number];

export interface BannerMeta {
  bannerIconId: string;
  bannerColorId: string;
}

export interface BattlePassMeta {
  bHasPurchasedPass: boolean;
  passLevel: number;
  selfBoostXp: number;
  friendBoostXp: number;
}

export interface AssistedChallengeMeta {
  questItemDef: string;
  objectivesCompleted: number;
}

export type Region = 'EU' | 'NAE' | 'NAW' | 'BR' | 'ME' | 'ASIA' | 'OCE';

export type FullPlatform = 'Windows' | 'Android' | 'PS4' | 'XboxOne' | 'XSX' | 'PS5' | 'Switch' | 'Windows' | 'Mac';

export type SentMessageType = 'PARTY' | 'FRIEND';

export interface TournamentColors {
  titleColor?: string;
  backgroundTextColor?: string;
  backgroundRightColor?: string;
  backgroundLeftColor?: string;
  shadowColor?: string;
  posterFadeColor?: string;
  baseColor?: string;
  highlightColor?: string;
}

export interface TournamentImages {
  loadingScreenImage?: string;
  posterBackImage?: string;
  posterFrontImage?: string;
  playlistTileImage?: string;
}

export interface TournamentTexts {
  pinEarnedText?: string;
  pinScoreRequirement?: number;
  scheduleInfo?: string;
  flavorDescription?: string;
  shortFormatTitle?: string;
  titleLine1?: string;
  titleLine2?: string;
  detailsDescription?: string;
  longFormatTitle?: string;
  backgroundTitle?: string;
}

export interface TournamentWindowTemplate {
  windowId: string;
  templateData: TournamentWindowTemplateData;
}

export interface PresencePartyData {
  bIsPrivate?: boolean;
  sourceId?: string;
  sourceDisplayName?: string;
  sourcePlatform?: string;
  partyId?: string;
  partyTypeId?: number;
  key?: 'k';
  appId?: string;
  buildId?: string;
  partyFlags?: number;
  notAcceptingReason?: number;
  pc?: number;
}

export type UserSearchPlatform = 'epic' | 'psn' | 'xbl' | 'steam';

export type UserSearchMatchType = 'exact' | 'prefix';

export interface UserSearchResultMatch {
  value: string;
  platform: UserSearchPlatform;
}

export interface BlurlStream {
  languages: {
    language: string;
    url: string;
    variants: {
      data: {
        codecs: string[];
        bandwidth: number;
        resolution: string;
      };
      type: 'video' | 'audio';
      url: string;
      stream: Buffer;
    }[];
  }[];
  data: {
    subtitles: any;
    ucp?: string;
    audioonly: boolean;
    aspectratio?: string;
    partysync: boolean;
    lrcs: any;
    duration?: number;
  };
}

export interface ReplayEvent {
  Id: string;
  Group: string;
  Metadata: string;
  Time1: number;
  Time2: number;
  data: Buffer;
}

export interface ReplayDataChunk {
  Id: string;
  Time1: number;
  Time2: number;
  SizeInBytes: number;
  data: Buffer;
}

export interface ReplayCheckpoint {
  Id: string;
  Group: string;
  Metadata: string;
  Time1: number;
  Time2: number;
  data: Buffer;
}

export interface ReplayData {
  ReplayName: string;
  LengthInMS: number;
  NetworkVersion: number;
  Changelist: number;
  FriendlyName: string;
  Timestamp: Date;
  bIsLive: boolean;
  bCompressed: boolean;
  DesiredDelayInSeconds: number;
  Checkpoints?: ReplayCheckpoint[];
  Events?: ReplayEvent[];
  DataChunks?: ReplayDataChunk[];
  Header: Buffer;
}

export type ReplayDataType = 'EVENT' | 'DATACHUNK' | 'CHECKPOINT';

export interface ReplayDownloadConfig {
  /**
   * Which replay data types to download.
   * EVENT data contains basic information like eliminations, you will only need EVENT data for ThisNils/node-replay-reader.
   * DATACHUNK data contains information that is required for most parsing libraries.
   * CHECKPOINT data contains information that is pretty much only useful if you want to use the replay ingame.
   * By default, only events and data chunks are downloaded
   */
  dataTypes: ReplayDataType[];

  /**
   * Whether a placeholder for AthenaMatchStats and AthenaMatchTeamStats should be added.
   * Required if you want to use the replay ingame, otherwise useless.
   * By default, this is set to false
   */
  addStatsPlaceholder: boolean;
}

export interface ReplayDownloadOptions extends Partial<ReplayDownloadConfig> {}

export interface EventTokensResponse {
  user: User;
  tokens: string[];
}

export interface BRAccountLevel {
  level: number;
  progress: number;
}

export interface BRAccountLevelData {
  user: User;
  level: BRAccountLevel;
}

export interface TournamentSessionMetadata {
  changelist: number;
  checkpoints: ReplayCheckpoint[];
  dataChunks: ReplayDataChunk[];
  desiredDelayInSeconds: number;
  events: ReplayEvent[];
  friendlyName: string;
  lengthInMS: number;
  networkVersion: number;
  replayName: string;
  timestamp: Date;
  isCompressed: boolean;
  isLive: boolean;
}

export interface STWFORTStats {
  fortitude: number;
  resistance: number;
  offense: number;
  tech: number;
}

export type STWSurvivorType = 'special' | 'manager' | 'basic';

export type STWItemRarity = 'c' | 'uc' | 'r' | 'vr' | 'sr' | 'ur';

export type STWItemTier = 1 | 2 | 3 | 4 | 5 | 6;

export type STWSurvivorGender = 'male' | 'female';

export interface STWSurvivorSquads {
  trainingteam: STWSurvivor[];
  fireteamalpha: STWSurvivor[];
  closeassaultsquad: STWSurvivor[];
  thethinktank: STWSurvivor[];
  emtsquad: STWSurvivor[];
  corpsofengineering: STWSurvivor[];
  scoutingparty: STWSurvivor[];
  gadgeteers: STWSurvivor[];
}

export type STWSurvivorSquadType = 'medicine' | 'arms' | 'synthesis' | 'scavenging';

export interface STWSurvivorSquadData {
  id: string;
  name: keyof STWSurvivorSquads;
  type: STWSurvivorSquadType;
  slotIdx: number;
}

export interface STWStatsNodeCostsData {
  [key: string]: {
    [key: string]: number;
  };
}

export interface STWStatsSTWLoadoutData {
  selectedHeroLoadout: string;
  modeLoadouts: string[];
  activeLoadoutIndex: number;
}

export interface STWStatsBRLoadoutData {
  loadouts: string[];
  lastAppliedLoadout: string;
  useRandomLoadout: boolean;
}

export interface STWStatsMissionAlertRedemptionData {
  missionAlertId: string;
  redemptionDateUtc: Date;
  evictClaimDataAfterUtc: Date;
}

export interface STWStatsQuestData {
  dailyLoginInterval: Date;
  dailyQuestRerolls?: number;
  poolStats: {
    stats: {
      poolName: string;
      nextRefresh: Date;
      rerollsRemaining: number;
      questHistory: string[];
    }[];
    dailyLoginInterval: Date;
    lockouts: {
      lockoutName: string;
    }[];
  };
}

export interface STWStatsGameplayStatData {
  statName: string;
  statValue: number;
}

export interface STWStatsClientSettingsData {
  pinnedQuestInstances?: any[];
}

export interface STWStatsResearchLevelsData {
  technology: number;
  offense: number;
  fortitude: number;
  resistance: number;
}

export interface STWStatsEventCurrencyData {
  templateId: string;
  cf: number;
}

export interface STWStatsXPData {
  total: number;
  overflow: number;
  lost: number;
}

export interface STWStatsDailyRewardsData {
  nextDefaultReward: number;
  totalDaysLoggedIn: number;
  lastClaimDate: Date;
  additionalSchedules?: {
    [key: string]: {
      rewardsClaimed: number;
      claimedToday: boolean;
    };
  };
}

export interface STWLockerSlotsData {
  Pickaxe: STWProfileLockerSlotData;
  MusicPack?: STWProfileLockerSlotData;
  Character?: STWProfileLockerSlotData;
  ItemWrap: STWProfileLockerSlotData;
  Backpack: STWProfileLockerSlotData;
  Dance: STWProfileLockerSlotData;
  LoadingScreen: STWProfileLockerSlotData;
}

export interface STWLockerBannerData {
  icon: string;
  color: string;
}

export type STWHeroType = 'commando' | 'constructor' | 'outlander' | 'ninja';

export type STWSchematicType = 'ranged' | 'melee' | 'trap' | 'other';

export type STWSchematicRangedSubType = 'assault' | 'launcher' | 'pistol' | 'shotgun' | 'smg' | 'sniper';

export type STWSchematicMeleeSubType = 'blunt' | 'blunt_hammer' | 'edged_axe' | 'edged_scythe' | 'edged_sword' | 'piercing_spear';

export type STWSchematicTrapSubType = 'ceiling' | 'floor' | 'wall';

export type STWSchematicSubType = STWSchematicRangedSubType | STWSchematicMeleeSubType | STWSchematicTrapSubType;

export type STWSchematicAlterationRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type STWSchematicEvoType = 'ore' | 'crystal';

export interface StatsLevelData {
  [key: string]: {
    level: number;
    progress: number;
  };
}

export interface ArenaDivisionData {
  [key: string]: number;
}

export interface NewsMessageVideoData {
  videoAutoplay: boolean;
  videoFullscreen: boolean;
  videoLoop: boolean;
  videoMute: boolean;
  videoStreamingEnabled: boolean;
  videoVideoString: string;
  videoUID: string;
}

export interface NewsMessagePlaylist {
  id: string;
}

export interface NewsMessageOffer {
  id: string;
  action: string;
}

export interface ImageData {
  url: string;
  width?: number;
  height?: number;
}

export interface STWWorldInfoData {
  theaters: STWTheaterData[];
  missions: STWMissionData[];
  missionAlerts: STWMissionAlertData[];
}

/* -------------------------------------------------------------------------- */
/*                                    Auth                                    */
/* -------------------------------------------------------------------------- */

export interface AuthData {
  access_token: string;
  account_id: string;
  client_id: string;
  expires_at: string;
  expires_in: number;
  token_type: string;
}

export interface LauncherAuthData extends AuthData {
  refresh_expires: number;
  refresh_expires_at: string;
  refresh_token: string;
  internal_client: boolean;
  client_service: string;
  scope: string[];
  displayName: string;
  app: string;
  in_app_id: string;
}

export interface FortniteAuthData extends AuthData {
  refresh_expires: number;
  refresh_expires_at: string;
  refresh_token: string;
  internal_client: boolean;
  client_service: string;
  displayName: string;
  app: string;
  in_app_id: string;
  device_id: string;
}

export interface FortniteClientCredentialsAuthData extends AuthData {
  internal_client: boolean;
  client_service: string;
  product_id: string;
  application_id: string;
}

export interface AuthSessionStore<K, V> extends Collection<K, V> {
  get(key: AuthSessionStoreKey.Fortnite): FortniteAuthSession | undefined;
  get(key: AuthSessionStoreKey.Launcher): LauncherAuthSession | undefined;
  get(key: AuthSessionStoreKey.FortniteClientCredentials): FortniteClientCredentialsAuthSession | undefined;
  get(key: K): V | undefined;
}
