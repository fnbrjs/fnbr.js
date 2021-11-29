/* eslint-disable no-restricted-syntax */
import { EventEmitter } from 'events';
import Collection from '@discordjs/collection';
import { ResponseType } from 'axios';
import Enums from '../../enums/Enums';
import {
  buildReplay, consoleQuestion, parseBlurlStream, parseM3U8File,
} from '../util/Util';
import Auth from './Auth';
import Http from './HTTP';
import AsyncLock from '../util/AsyncLock';
import {
  ClientOptions, ClientConfig, ClientEvents, StatsData, NewsMOTD, NewsMessage, LightswitchData,
  EpicgamesServerStatusData, PartyConfig, Schema, PresenceOnlineType, Region, FullPlatform,
  TournamentWindowTemplate, UserSearchPlatform, BlurlStream, ReplayData, ReplayDownloadOptions,
  ReplayDownloadConfig, EventTokensResponse, BRAccountLevel, TournamentSessionMetadata,
} from '../../resources/structs';
import Endpoints from '../../resources/Endpoints';
import ClientUser from '../structures/ClientUser';
import XMPP from './XMPP';
import Friend from '../structures/Friend';
import User from '../structures/User';
import {
  BlurlStreamData, CreativeIslandData,
  BlurlStreamMasterPlaylistData, CreativeDiscoveryPanel,
  EpicgamesAPIResponse, TournamentData, TournamentDisplayData,
  TournamentWindowResults, TournamentWindowTemplateData,
} from '../../resources/httpResponses';
import UserNotFoundError from '../exceptions/UserNotFoundError';
import StatsPrivacyError from '../exceptions/StatsPrivacyError';
import CreatorCode from '../structures/CreatorCode';
import CreatorCodeNotFoundError from '../exceptions/CreatorCodeNotFoundError';
import FriendNotFoundError from '../exceptions/FriendNotFoundError';
import DuplicateFriendshipError from '../exceptions/DuplicateFriendshipError';
import FriendshipRequestAlreadySentError from '../exceptions/FriendshipRequestAlreadySentError';
import InviterFriendshipsLimitExceededError from '../exceptions/InviterFriendshipsLimitExceededError';
import InviteeFriendshipsLimitExceededError from '../exceptions/InviteeFriendshipsLimitExceededError';
import InviteeFriendshipRequestLimitExceededError from '../exceptions/InviteeFriendshipRequestLimitExceededError';
import InviteeFriendshipSettingsError from '../exceptions/InviteeFriendshipSettingsError';
import IncomingPendingFriend from '../structures/IncomingPendingFriend';
import OutgoingPendingFriend from '../structures/OutgoingPendingFriend';
import BlockedUser from '../structures/BlockedUser';
import ClientParty from '../structures/ClientParty';
import SendMessageError from '../exceptions/SendMessageError';
import Party from '../structures/Party';
import PartyNotFoundError from '../exceptions/PartyNotFoundError';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import PartyPermissionError from '../exceptions/PartyPermissionError';
import PartyMaxSizeReachedError from '../exceptions/PartyMaxSizeReachedError';
import Tournament from '../structures/Tournament';
import SentPartyJoinRequest from '../structures/SentPartyJoinRequest';
import UserSearchResult from '../structures/UserSearchResult';
import RadioStation from '../structures/RadioStation';
import SentFriendMessage from '../structures/SentFriendMessage';
import MatchNotFoundError from '../exceptions/MatchNotFoundError';
import CreativeIslandNotFoundError from '../exceptions/CreativeIslandNotFoundError';

/**
 * Represets the main client
 */
class Client extends EventEmitter {
  /**
   * Timeouts set by {@link Client#setTimeout} that are still active
   */
  // eslint-disable-next-line no-undef
  private timeouts: Set<NodeJS.Timeout>;

  /**
   * Intervals set by {@link Client#setInterval} that are still active
   */
  // eslint-disable-next-line no-undef
  private intervals: Set<NodeJS.Timeout>;

  /**
   * All client configuration options
   */
  public config: ClientConfig;

  /**
   * Authentication manager
   */
  public auth: Auth;

  /**
   * Lock used to pause all http requests while the client is reauthenticating
   */
  public reauthLock: AsyncLock;

  /**
   * Lock used to pause certain incoming xmpp messages while the bots party is being modified
   */
  public partyLock: AsyncLock;

  /**
   * HTTP manager
   */
  public http: Http;

  /**
   * Epicgames account of the client
   */
  public user?: ClientUser;

  /**
   * Whether the client is fully started
   */
  public isReady: boolean;

  /**
   * XMPP manager
   */
  public xmpp: XMPP;

  /**
   * Friend list
   */
  public friends: Collection<string, Friend>;

  /**
   * Pending friend requests (incoming or outgoing)
   */
  public pendingFriends: Collection<string, IncomingPendingFriend|OutgoingPendingFriend>;

  /**
   * User blocklist
   */
  public blockedUsers: Collection<string, BlockedUser>;

  /**
   * The client's current party
   */
  public party?: ClientParty;

  /**
   * The last saved client party member meta
   */
  public lastPartyMemberMeta?: Schema;

  /**
   * @param config The client's configuration options
   */
  constructor(config: ClientOptions = {}) {
    super();

    this.config = {
      savePartyMemberMeta: true,
      http: {},
      debug: undefined,
      httpDebug: undefined,
      xmppDebug: undefined,
      defaultStatus: undefined,
      defaultOnlineType: 'online',
      platform: 'WIN',
      defaultPartyMemberMeta: {},
      xmppKeepAliveInterval: 30,
      createParty: true,
      forceNewParty: true,
      connectToXMPP: true,
      fetchFriends: true,
      restRetryLimit: 1,
      handleRatelimits: true,
      partyBuildId: '1:3:',
      restartOnInvalidRefresh: false,
      ...config,
      cacheSettings: {
        ...config.cacheSettings,
        presences: {
          maxLifetime: Infinity,
          sweepInterval: 0,
          ...config.cacheSettings?.presences,
        },
      },
      auth: {
        authorizationCode: async () => consoleQuestion('Please enter an authorization code: '),
        checkEULA: true,
        killOtherTokens: true,
        authClient: 'fortniteIOSGameClient',
        ...config.auth,
      },
      partyConfig: {
        privacy: Enums.PartyPrivacy.PUBLIC,
        joinConfirmation: false,
        joinability: 'OPEN',
        maxSize: 16,
        chatEnabled: true,
        discoverability: 'ALL',
        ...config.partyConfig,
      },
    };

    this.timeouts = new Set();
    this.intervals = new Set();

    this.auth = new Auth(this);
    this.http = new Http(this);
    this.xmpp = new XMPP(this);

    this.reauthLock = new AsyncLock();
    this.partyLock = new AsyncLock();

    this.user = undefined;
    this.isReady = false;

    this.friends = new Collection();
    this.pendingFriends = new Collection();
    this.blockedUsers = new Collection();

    this.party = undefined;
    this.lastPartyMemberMeta = this.config.defaultPartyMemberMeta;
  }

  // Events
  public on<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this {
    return super.on(event, listener);
  }

  public once<U extends keyof ClientEvents>(event: U, listener: ClientEvents[U]): this {
    return super.once(event, listener);
  }

  public emit<U extends keyof ClientEvents>(event: U, ...args: Parameters<ClientEvents[U]>): boolean {
    return super.emit(event, ...args);
  }

  /* -------------------------------------------------------------------------- */
  /*                           CLIENT LOGIN AND LOGOUT                          */
  /* -------------------------------------------------------------------------- */

  /**
   * Logs the client in.
   * A valid authentication method must be provided in the client's config.
   * By default, there will be a console prompt asking for an authorization code
   * @throws {EpicgamesAPIError}
   * @throws {EpicgamesGraphQLError}
   */
  public async login() {
    const auth = await this.auth.authenticate();
    if (!auth.response) throw auth.error || new Error('Couldn\'t authenticate the client');

    const clientInfo = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.ACCOUNT_ID}/${auth.response.account_id}`, 'fortnite');
    if (!clientInfo.response) throw clientInfo.error || new Error('Couldn\'t fetch the client\'s account info');

    this.user = new ClientUser(this, clientInfo.response);
    await this.user.fetch();

    this.initCacheSweeping();

    if (this.config.connectToXMPP) {
      this.xmpp.setup();
      const xmpp = await this.xmpp.connect();
      if (!xmpp.response) throw xmpp.error || new Error('Couldn\'t connect to XMPP');
    }

    if (this.config.fetchFriends) {
      await this.updateCaches();
    }

    await this.initParty(this.config.createParty, this.config.forceNewParty);
    this.setStatus();

    this.isReady = true;
    this.emit('ready');
  }

  /**
   * Logs the client out.
   * Also clears all caches, etc
   */
  public async logout() {
    await this.auth.killAllTokens();
    await this.xmpp.disconnect();
    this.destroy();
    this.isReady = false;
    this.emit('disconnected');
  }

  /**
   * Restarts the client
   */
  public async restart() {
    const refreshToken = this.auth.auths.get('fortnite')?.refresh_token;
    await this.logout();

    this.config.auth.refreshToken = refreshToken;
    await this.login();
  }

  /**
   * Initializes {@link Client#party}
   * @param createNew Whether to create a new party
   * @param forceNew Whether to force create a new party
   */
  public async initParty(createNew = true, forceNew = true) {
    this.party = await this.getClientParty();
    if (!forceNew && this.party) return;
    if (createNew) {
      await this.leaveParty(false);
      await this.createParty();
    }
  }

  /**
   * Waits until the client is ready
   * @param timeout How long to wait for until an error is thrown
   */
  public async waitUntilReady(timeout = 10000) {
    if (this.isReady) return;
    this.setMaxListeners(this.getMaxListeners() + 1);
    try {
      await this.waitForEvent('ready', timeout);
    } finally {
      this.setMaxListeners(this.getMaxListeners() - 1);
    }
  }

  /**
   * Cleanup method
   */
  private destroy() {
    // Clear timeouts
    for (const interval of this.intervals) clearInterval(interval);
    for (const timeout of this.timeouts) clearTimeout(timeout);
    this.timeouts.clear();
    this.intervals.clear();

    // Clear remaining caches
    this.friends.clear();
    this.pendingFriends.clear();
    this.blockedUsers.clear();
  }

  /**
   * Initializes the sweeping of cached objects
   */
  private initCacheSweeping() {
    const { cacheSettings } = this.config;

    const presenceCacheSettings = cacheSettings.presences;
    if (presenceCacheSettings && presenceCacheSettings.sweepInterval && presenceCacheSettings.sweepInterval > 0
      && presenceCacheSettings.maxLifetime > 0 && presenceCacheSettings.maxLifetime !== Infinity) {
      this.setInterval(this.sweepPresences.bind(this), presenceCacheSettings.sweepInterval);
    }
  }

  /**
   * Updates the client's caches
   */
  public async updateCaches() {
    const friendsSummary = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.FRIENDS}/v1/${this.user?.id}/summary`, 'fortnite');

    if (friendsSummary.error) throw friendsSummary.error;

    this.friends.clear();
    this.pendingFriends.clear();
    this.blockedUsers.clear();

    friendsSummary.response.friends.forEach((f: any) => {
      this.friends.set(f.accountId, new Friend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.response.incoming.forEach((f: any) => {
      this.pendingFriends.set(f.accountId, new IncomingPendingFriend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.response.outgoing.forEach((f: any) => {
      this.pendingFriends.set(f.accountId, new OutgoingPendingFriend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.response.blocklist.forEach((u: any) => {
      this.blockedUsers.set(u.accountId, new BlockedUser(this, { ...u, id: u.accountId }));
    });

    const users = await this.getProfile([...this.friends.values(), ...this.pendingFriends.values(), ...this.blockedUsers.values()]
      .filter((u) => !!u.id).map((u) => u.id));

    users.forEach((u) => {
      this.friends.get(u.id)?.update(u);
      this.pendingFriends.get(u.id)?.update(u);
      this.blockedUsers.get(u.id)?.update(u);
    });
  }

  /**
   * Removes presences from the clients cache that are older than the max lifetime
   * @param maxLifetime How old a presence must be before it can be sweeped (in ms)
   * @returns The amount of presences sweeped
   */
  public sweepPresences(maxLifetime = this.config.cacheSettings.presences?.maxLifetime) {
    if (typeof maxLifetime !== 'number') throw new TypeError('maxLifetime must be typeof number');

    let presences = 0;
    for (const friend of this.friends.values()) {
      if (typeof friend.presence?.receivedAt !== 'undefined' && Date.now() - friend.presence.receivedAt.getTime() > maxLifetime) {
        delete friend.presence;
        presences += 1;
      }
    }

    return presences;
  }

  /* -------------------------------------------------------------------------- */
  /*                                    UTIL                                    */
  /* -------------------------------------------------------------------------- */

  /**
   * Wait until an event is emitted
   * @param event The event that will be waited for
   * @param timeout The timeout (in milliseconds)
   * @param filter The filter for the event
   */
  public waitForEvent<U extends keyof ClientEvents>(event: U, timeout = 5000,
    // eslint-disable-next-line no-unused-vars
    filter?: (...args: Parameters<ClientEvents[U]>) => boolean): Promise<Parameters<ClientEvents[U]>> {
    return new Promise<any>((res, rej) => {
      const handler = (...data: any) => {
        if (!filter || filter(...data)) {
          this.removeListener(event, handler);
          res(data);
        }
      };

      this.on(event, handler);

      setTimeout(() => {
        this.removeListener(event, handler);
        rej(new Error('Event timeout exceed'));
      }, timeout);
    });
  }

  /**
   * Sets a timeout that will be automatically cancelled if the client is logged out
   * @param fn Function to execute
   * @param delay Time to wait before executing (in milliseconds)
   * @param args Arguments for the function
   */
  // eslint-disable-next-line no-unused-vars
  public setTimeout(fn: (...args: any) => any, delay: number, ...args: any) {
    const timeout = setTimeout(() => {
      fn(args);
      this.timeouts.delete(timeout);
    }, delay);
    this.timeouts.add(timeout);
    return timeout;
  }

  /**
   * Clears a timeout
   * @param timeout Timeout to cancel
   */
  // eslint-disable-next-line no-undef
  public clearTimeout(timeout: NodeJS.Timeout) {
    clearTimeout(timeout);
    this.timeouts.delete(timeout);
  }

  /**
   * Sets an interval that will be automatically cancelled if the client is logged out
   * @param fn Function to execute
   * @param delay Time to wait between executions (in milliseconds)
   * @param args Arguments for the function
   */
  // eslint-disable-next-line no-unused-vars
  public setInterval(fn: (...args: any) => any, delay: number, ...args: any) {
    const interval = setInterval(fn, delay, ...args);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Clears an interval.
   * @param interval Interval to cancel
   */
  // eslint-disable-next-line no-undef
  public clearInterval(interval: NodeJS.Timeout) {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  public static consoleQuestion(question: string) {
    return consoleQuestion(question);
  }

  /**
   * Debug a message using the methods set in the client config
   * @param message Text to debug
   * @param type Debug type (regular, http or xmpp)
   */
  public debug(message: string, type: 'regular' | 'http' | 'xmpp' = 'regular') {
    switch (type) {
      case 'regular': if (typeof this.config.debug === 'function') this.config.debug(message); break;
      case 'http': if (typeof this.config.httpDebug === 'function') this.config.httpDebug(message); break;
      case 'xmpp': if (typeof this.config.xmppDebug === 'function') this.config.xmppDebug(message); break;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                  ACCOUNTS                                  */
  /* -------------------------------------------------------------------------- */

  // eslint-disable-next-line no-unused-vars
  public async getProfile(query: string): Promise<User|undefined>;
  // eslint-disable-next-line no-unused-vars
  public async getProfile(query: string[]): Promise<User[]>;

  /**
   * Fetches one or multiple Epicgames accounts by id or display name
   * Returns undefined if the user(s) wasn't/weren't found
   * @param query An array of display names and/or account ids
   * @throws {EpicgamesAPIError}
   */
  public async getProfile(query: string | string[]): Promise<User | User[] | undefined> {
    if (typeof query === 'string') {
      let user: EpicgamesAPIResponse | undefined;

      if (query.length === 32) {
        user = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${query}`, 'fortnite');
      } else if (query.length >= 3 && query.length <= 16) {
        user = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURIComponent(query)}`, 'fortnite');
      } else return undefined;

      if (user?.error) {
        if (user.error.code === 'errors.com.epicgames.account.account_not_found') return undefined;
        throw user.error;
      }

      if (Array.isArray(user.response) && !user.response[0]) return undefined;

      return new User(this, Array.isArray(user?.response) ? user?.response[0] : user?.response);
    }

    const displayNames: string[] = [];
    const ids: string[] = [];

    query.forEach((q) => {
      if (q.length === 32) ids.push(q);
      else if (q.length >= 3 && q.length <= 16) displayNames.push(q);
    });

    const proms = [];

    proms.push(...displayNames
      .map((dn) => this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURIComponent(dn)}`, 'fortnite')));

    const idChunks: string[][] = ids.reduce((resArr: any[], id, i) => {
      const chunkIndex = Math.floor(i / 100);
      // eslint-disable-next-line no-param-reassign
      if (!resArr[chunkIndex]) resArr[chunkIndex] = [];
      resArr[chunkIndex].push(id);
      return resArr;
    }, []);

    proms.push(...idChunks
      .map((ic) => this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${ic.join('&accountId=')}`, 'fortnite')));

    const users = await Promise.all(proms);

    return users.map((u) => {
      if (u.error && u.error.code !== 'errors.com.epicgames.account.account_not_found') throw u.error;

      if (Array.isArray(u.response)) return u.response.map((ur) => new User(this, ur));
      return new User(this, u.response);
    }).flat(1);
  }

  /**
   * Fetches users that match a prefix
   * @param prefix The prefix (a string that the user's display names start with)
   * @param platform The search platform. Other platform's accounts will still be searched with a lower priority
   */
  public async searchProfiles(prefix: string, platform: UserSearchPlatform = 'epic'): Promise<UserSearchResult[]> {
    const results = await this.http.sendEpicgamesRequest(true, 'GET',
      `${Endpoints.ACCOUNT_SEARCH}/${this.user?.id}?prefix=${encodeURIComponent(prefix)}&platform=${platform}`, 'fortnite');

    const users = await this.getProfile(results.response.map((r: any) => r.accountId) as string[]);

    return results.response.map((r: any) => new UserSearchResult(this, users.find((u) => u.id === r.accountId) as User, r));
  }

  /**
   * Resolves a single user id
   * @param query Display name or id of the account's id to resolve
   */
  private async resolveUserId(query: string) {
    if (query.length === 32) return query;
    return (await this.getProfile(query))?.id;
  }

  /**
   * Resolves multiple user ids
   * @param query Display names or ids of the account's ids to resolve
   */
  private async resolveUserIds(query: string[]) {
    const displayNames: string[] = [];
    const ids: string[] = [];

    query.forEach((q) => {
      if (q.length === 32) ids.push(q);
      else if (q.length >= 3 && q.length <= 16) displayNames.push(q);
    });

    const users = await Promise.all(displayNames.map((dn) => this.getProfile(dn)));

    return [...ids.map((id) => ({ id, query: id })), ...users.filter((u) => !!u).map((u) => ({ id: u?.id as string, query: u?.displayName as string }))];
  }

  /* -------------------------------------------------------------------------- */
  /*                                   FRIENDS                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Sets the clients XMPP status
   * @param status The status
   * @param onlineType The presence's online type (eg "away")
   * @param friend A specific friend you want to send this status to
   * @throws {FriendNotFoundError} The friend wasn't found
   */
  public setStatus(status?: string, onlineType?: PresenceOnlineType, friend?: string) {
    // eslint-disable-next-line no-undef-init
    let toJID: string | undefined = undefined;
    if (friend) {
      const resolvedFriend = this.friends.find((f) => f.displayName === friend || f.id === friend);
      if (!resolvedFriend) throw new FriendNotFoundError(friend);
      toJID = `${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`;
    }

    // eslint-disable-next-line no-undef-init
    let partyJoinInfoData: { [key: string]: any } | undefined = undefined;
    if (this.party) {
      const partyPrivacy = this.party.config.privacy;
      if (partyPrivacy.presencePermission === 'Noone' || (partyPrivacy.presencePermission === 'Leader' && !this.party.me?.isLeader)) {
        partyJoinInfoData = {
          isPrivate: true,
        };
      } else {
        partyJoinInfoData = {
          sourceId: this.user?.id,
          sourceDisplayName: this.user?.displayName,
          sourcePlatform: this.config.platform,
          partyId: this.party.id,
          partyTypeId: 286331153,
          key: 'k',
          appId: 'Fortnite',
          buildId: this.config.partyBuildId,
          partyFlags: -2024557306,
          notAcceptingReason: 0,
          pc: this.party.size,
        };
      }
    }

    if (status) this.config.defaultStatus = status;
    if (onlineType) this.config.defaultOnlineType = onlineType;

    const rawStatus = {
      Status: this.config.defaultStatus
        || (this.party && `Battle Royale Lobby - ${this.party.size} / ${this.party.maxSize}`) || 'Playing Battle Royale',
      bIsPlaying: false,
      bIsJoinable: false,
      bHasVoiceSupport: false,
      SessionId: '',
      Properties: {
        'party.joininfodata.286331153_j': partyJoinInfoData,
        FortBasicInfo_j: {
          homeBaseRating: 1,
        },
        FortLFG_I: '0',
        FortPartySize_i: 1,
        FortSubGame_i: 1,
        InUnjoinableMatch_b: false,
        FortGameplayStats_j: {
          state: '',
          playlist: 'None',
          numKills: 0,
          bFellToDeath: false,
        },
      },
    };

    const rawOnlineType = this.config.defaultOnlineType === 'online' ? undefined : this.config.defaultOnlineType;

    return this.xmpp.sendStatus(rawStatus, rawOnlineType, toJID);
  }

  /**
   * Resets the client's XMPP status and online type
   */
  public async resetStatus() {
    this.config.defaultStatus = undefined;
    this.config.defaultOnlineType = 'online';

    return this.setStatus();
  }

  /**
   * Sends a friendship request to a user or accepts an existing request
   * @param friend The id or display name of the user to add
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {DuplicateFriendshipError} The user is already friends with the client
   * @throws {FriendshipRequestAlreadySentError} A friendship request has already been sent to the user
   * @throws {InviterFriendshipsLimitExceededError} The client's friendship limit is reached
   * @throws {InviteeFriendshipsLimitExceededError} The user's friendship limit is reached
   * @throws {InviteeFriendshipSettingsError} The user disabled friend requests
   * @throws {InviteeFriendshipRequestLimitExceededError} The user's incoming friend request limit is reached
   * @throws {EpicgamesAPIError}
   */
  public async addFriend(friend: string) {
    const userID = await this.resolveUserId(friend);
    if (!userID) throw new UserNotFoundError(friend);

    const addFriend = await this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.FRIEND_ADD}/${this.user?.id}/${userID}`, 'fortnite');

    if (addFriend.error) {
      switch (addFriend.error.code) {
        case 'errors.com.epicgames.friends.duplicate_friendship':
          throw new DuplicateFriendshipError(friend);
        case 'errors.com.epicgames.friends.friend_request_already_sent':
          throw new FriendshipRequestAlreadySentError(friend);
        case 'errors.com.epicgames.friends.inviter_friendships_limit_exceeded':
          throw new InviterFriendshipsLimitExceededError(friend);
        case 'errors.com.epicgames.friends.invitee_friendships_limit_exceeded':
          throw new InviteeFriendshipsLimitExceededError(friend);
        case 'errors.com.epicgames.friends.incoming_friendships_limit_exceeded':
          throw new InviteeFriendshipRequestLimitExceededError(friend);
        case 'errors.com.epicgames.friends.cannot_friend_due_to_target_settings':
          throw new InviteeFriendshipSettingsError(friend);
        case 'errors.com.epicgames.friends.account_not_found':
          throw new UserNotFoundError(friend);
        default:
          throw addFriend.error;
      }
    }
  }

  /**
   * Removes a friend from the client's friend list or declines / aborts a pending friendship request
   * @param friend The id or display name of the friend
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {FriendNotFoundError} The user is not friends with the client
   * @throws {EpicgamesAPIError}
   */
  public async removeFriend(friend: string) {
    let resolvedFriend: Friend | OutgoingPendingFriend | IncomingPendingFriend | undefined;
    resolvedFriend = this.friends.find((f) => f.displayName === friend || f.id === friend);
    if (!resolvedFriend) resolvedFriend = this.pendingFriends.find((f) => f.displayName === friend || f.id === friend);

    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const removeFriend = await this.http.sendEpicgamesRequest(true, 'DELETE', `${Endpoints.FRIEND_DELETE}/${this.user?.id}/friends/${resolvedFriend.id}`, 'fortnite');
    if (removeFriend.error) throw removeFriend.error;
  }

  /**
   * Blocks a user
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async blockUser(user: string) {
    const userID = await this.resolveUserId(user);
    if (!userID) throw new UserNotFoundError(user);

    const blockUser = await this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.FRIEND_BLOCK}/${this.user?.id}/${userID}`, 'fortnite');
    if (blockUser.error) throw blockUser.error;
  }

  /**
   * Unblocks a user
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async unblockUser(user: string) {
    const blockedUser = this.blockedUsers.find((u) => u.displayName === user || u.id === user);
    if (!blockedUser) throw new UserNotFoundError(user);

    const unblockUser = await this.http.sendEpicgamesRequest(true, 'DELETE', `${Endpoints.FRIEND_BLOCK}/${this.user?.id}/${blockedUser.id}`, 'fortnite');
    if (unblockUser.error) throw unblockUser.error;
  }

  /**
   * Sends a message to a friend
   * @param friend The id or display name of the friend
   * @param content The message that will be sent
   * @throws {FriendNotFoundError|SendMessageError} The user is not friends with the client
   */
  public async sendFriendMessage(friend: string, content: string) {
    const resolvedFriend = this.friends.find((f) => f.displayName === friend || f.id === friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    if (!this.xmpp.isConnected) throw new SendMessageError('You\'re not connected via XMPP', 'FRIEND', resolvedFriend);

    const message = await this.xmpp.sendMessage(`${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`, content);

    if (!message) throw new SendMessageError('Message timeout exceeded', 'FRIEND', resolvedFriend);

    return new SentFriendMessage(this, {
      author: this.user as ClientUser, content, id: message.id as string, sentAt: new Date(),
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                   PARTIES                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Sends a party invitation to a friend
   * @param friend The friend that will receive the invitation
   * @throws {FriendNotFoundError} The user is not friends with the client
   * @throws {PartyAlreadyJoinedError} The user is already a member of this party
   * @throws {PartyMaxSizeReachedError} The party reached its max size
   * @throws {EpicgamesAPIError}
   */
  public async invite(friend: string) {
    if (!this.party) throw new PartyNotFoundError();

    return this.party.invite(friend);
  }

  /**
   * Joins a party by its id
   * @param id The party id
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched
   * @throws {PartyMaxSizeReachedError} The party has reached its max size
   * @throws {EpicgamesAPIError}
   */
  public async joinParty(id: string) {
    this.partyLock.lock();

    // eslint-disable-next-line no-undef-init
    let party: Party | undefined = undefined;

    try {
      party = await this.getParty(id);
    } catch (e) {
      if (e instanceof EpicgamesAPIError) {
        if (e.code === 'errors.com.epicgames.social.party.party_not_found') throw new PartyNotFoundError();
        if (e.code === 'errors.com.epicgames.social.party.party_query_forbidden') throw new PartyPermissionError();
        if (e.code === 'errors.com.epicgames.social.party.party_is_full') throw new PartyMaxSizeReachedError();
        throw e;
      } else {
        throw e;
      }
    }

    if (this.party) await this.party.leave(false);

    const joinParty = await this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.BR_PARTY}/parties/${party.id}/members/${this.user?.id}/join`, 'fortnite', {
      'Content-Type': 'application/json',
    }, {
      connection: {
        id: this.xmpp.JID,
        meta: {
          'urn:epic:conn:platform_s': this.config.platform,
          'urn:epic:conn:type_s': 'game',
        },
        yield_leadership: false,
      },
      meta: {
        'urn:epic:member:dn_s': this.user?.displayName,
        'urn:epic:member:joinrequestusers_j': JSON.stringify({
          users: [
            {
              id: this.user?.id,
              dn: this.user?.displayName,
              plat: this.config.platform,
              data: JSON.stringify({
                CrossplayPreference: '1',
                SubGame_u: '1',
              }),
            },
          ],
        }),
      },
    });

    if (joinParty.error) {
      this.partyLock.unlock();
      await this.initParty(true, false);
      if (joinParty.error.code === 'errors.com.epicgames.social.party.user_has_party') {
        throw joinParty.error;
      } else throw joinParty.error;
    }

    this.party = new ClientParty(this, party.toObject());
    await this.party.chat.join();
    this.partyLock.unlock();
  }

  /**
   * Creates a new party
   * @param config The party config
   * @throws {EpicgamesAPIError}
   */
  public async createParty(config?: PartyConfig): Promise<void> {
    if (this.party) await this.party.leave();
    this.partyLock.lock();

    const partyConfig = { ...this.config.partyConfig, ...config };
    const party = await this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.BR_PARTY}/parties`, 'fortnite', {
      'Content-Type': 'application/json',
    }, {
      config: {
        join_confirmation: partyConfig.joinConfirmation,
        joinability: partyConfig.joinability,
        max_size: partyConfig.maxSize,
      },
      join_info: {
        connection: {
          id: this.xmpp.JID,
          meta: {
            'urn:epic:conn:platform_s': this.config.platform,
            'urn:epic:conn:type_s': 'game',
          },
          yield_leadership: false,
        },
        meta: {
          'urn:epic:member:dn_s': this.user?.displayName,
        },
      },
      meta: {
        'urn:epic:cfg:party-type-id_s': 'default',
        'urn:epic:cfg:build-id_s': '1:3:',
        'urn:epic:cfg:join-request-action_s': 'Manual',
        'urn:epic:cfg:chat-enabled_b': partyConfig.chatEnabled?.toString() || 'true',
        'urn:epic:cfg:can-join_b': 'true',
      },
    });

    if (party.error) {
      this.partyLock.unlock();
      if (party.error.code === 'errors.com.epicgames.social.party.user_has_party') {
        await this.leaveParty(false);
        return this.createParty(config);
      }
      throw party.error;
    }

    this.party = new ClientParty(this, party.response);

    const newPrivacy = await this.party.setPrivacy(partyConfig.privacy || Enums.PartyPrivacy.PUBLIC, false);
    await this.party.sendPatch({
      ...newPrivacy.updated,
      ...Object.keys(this.party.meta.schema).filter((k: string) => !k.startsWith('urn:'))
        // eslint-disable-next-line no-param-reassign
        .reduce((obj, key) => { (obj as any)[key] = this.party?.meta.schema[key]; return obj; }, {}),
    }, newPrivacy.deleted);

    this.partyLock.unlock();
    await this.party.chat.join();
    return undefined;
  }

  /**
   * Leaves the client's current party
   * @param createNew Whether a new party should be created
   * @throws {EpicgamesAPIError}
   */
  public async leaveParty(createNew = true) {
    if (!this.party) return;
    this.partyLock.lock();

    if (this.party.chat.isConnected) await this.party.chat.leave();

    const partyLeave = await this.http.sendEpicgamesRequest(true, 'DELETE',
      `${Endpoints.BR_PARTY}/parties/${this.party.id}/members/${this.user?.id}`, 'fortnite');

    if (partyLeave.error && partyLeave.error?.code !== 'errors.com.epicgames.social.party.party_not_found') {
      this.partyLock.unlock();
      throw partyLeave.error;
    }

    this.party = undefined;

    this.partyLock.unlock();
    if (createNew) await this.createParty();
  }

  /**
   * Sends a party join request to a friend.
   * When the friend confirms this, a party invite will be sent to the client
   * @param friend The friend
   * @throws {FriendNotFoundError} The friend wasn't found
   * @throws {PartyNotFoundError} The friend is not in a party
   * @throws {EpicgamesAPIError}
   */
  public async sendRequestToJoin(friend: string) {
    const resolvedFriend = this.friends.find((f) => f.displayName === friend || f.id === friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    const intention = await this.http.sendEpicgamesRequest(true, 'POST',
      `${Endpoints.BR_PARTY}/members/${resolvedFriend.id}/intentions/${this.user?.id}`, 'fortnite', {
        'Content-Type': 'application/json',
      }, {
        'urn:epic:invite:platformdata_s': '',
      });

    if (intention.error) {
      if (intention.error.code === 'errors.com.epicgames.social.party.user_has_no_party') throw new PartyNotFoundError();
      throw intention.error;
    }

    return new SentPartyJoinRequest(this, this.user as ClientUser, resolvedFriend, intention.response);
  }

  /**
   * Fetches the client's party
   * @throws {EpicgamesAPIError}
   */
  public async getClientParty() {
    const party = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_PARTY}/user/${this.user?.id}`, 'fortnite');
    if (party.error) throw party.error;

    if (!party.response?.current[0]) return undefined;
    return new ClientParty(this, party.response.current[0]);
  }

  /**
   * Fetches a party by its id
   * @param id The party's id
   * @throws {EpicgamesAPIError}
   */
  public async getParty(id: string) {
    const party = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_PARTY}/parties/${id}`, 'fortnite');
    if (party.error) throw party.error;

    const constuctedParty = new Party(this, party.response);
    await constuctedParty.updateMemberBasicInfo();

    return constuctedParty;
  }

  /* -------------------------------------------------------------------------- */
  /*                                  FORTNITE                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetches the current Fortnite server status (lightswitch)
   * @throws {EpicgamesAPIError}
   */
  public async getFortniteServerStatus(): Promise<LightswitchData> {
    const fortniteServerStatus = await this.http.sendEpicgamesRequest(true, 'GET', Endpoints.BR_SERVER_STATUS, 'fortnite');

    if (fortniteServerStatus.error) throw fortniteServerStatus.error;

    return fortniteServerStatus.response[0];
  }

  /**
   * Fetches the current epicgames server status (https://status.epicgames.com/)
   * @throws {AxiosError}
   */
  public async getEpicgamesServerStatus(): Promise<EpicgamesServerStatusData> {
    const epicgamesServerStatus = await this.http.send('GET', Endpoints.SERVER_STATUS_SUMMARY);

    if (epicgamesServerStatus.error) throw epicgamesServerStatus.error;
    if (!epicgamesServerStatus.response) throw new Error('Request returned an empty body');

    return epicgamesServerStatus.response.data;
  }

  /**
   * Fetches the current Fortnite storefronts
   * @param language The language
   * @throws {EpicgamesAPIError}
   */
  public async getStorefronts(language = Enums.Language.ENGLISH) {
    const store = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_STORE}?lang=${language}`, 'fortnite');
    if (store.error) throw store.error;

    return store.response.storefronts;
  }

  /**
   * Downloads a blurl stream (eg a radio station stream or a news video)
   * @param id The stream ID
   * @throws {AxiosError}
   */
  public async downloadBlurlStream(id: string): Promise<BlurlStream> {
    const blurlFile = await this.http.send('GET', `${Endpoints.BR_STREAM}/${id}/master.blurl`,
      undefined, undefined, undefined, 'arraybuffer');
    if (blurlFile.error) throw blurlFile.error;

    const streamData: BlurlStreamData = await parseBlurlStream(blurlFile.response?.data);

    const streamMetaData = {
      subtitles: streamData.subtitles ? JSON.parse(streamData.subtitles) : {},
      ucp: streamData.ucp,
      audioonly: !!streamData.audioonly,
      aspectratio: streamData.aspectratio,
      partysync: !!streamData.partysync,
      lrcs: streamData.lrcs ? JSON.parse(streamData.lrcs) : {},
      duration: streamData.duration,
    };

    const languageStreams = (streamData.playlists.filter((p) => p.type === 'master') as BlurlStreamMasterPlaylistData[]).map((s) => {
      let baseURL = s.url.match(/.+\//)?.[0];
      if (baseURL && !baseURL.endsWith('/')) baseURL += '/';

      const data = parseM3U8File(s.data);

      let variants = data.streams.map((ss: any) => ({
        data: {
          codecs: ss.data.CODECS?.split(',') || [],
          bandwidth: parseInt(ss.data.BANDWIDTH, 10),
          resolution: ss.data.RESOLUTION,
        },
        type: ss.data.AUDIO ? 'video' : 'audio',
        url: `${baseURL || ''}${ss.url}`,
        stream: streamData.playlists
          .find((p) => p.type === 'variant' && p.rel_url === ss.url)?.data
          .split(/\n/)
          .map((l) => (!l.startsWith('#') && l.length > 0 ? `${baseURL || ''}${l}` : l))
          .join('\n')
          .replace(/init_/g, `${baseURL || ''}init_`),
      }));

      if (!streamMetaData.audioonly) {
        const audioStreamUrl = variants.find((v: any) => v.type === 'audio')?.url;

        if (audioStreamUrl) {
          variants = variants.map((v: any) => ({
            ...v,
            stream: Buffer.from(v.type !== 'video' ? v.stream : v.stream.replace('#EXTINF:', '#EXT-X-STREAM-INF:AUDIO="group_audio"\n'
              + `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_audio",NAME="audio",DEFAULT=YES,URI="${audioStreamUrl}"\n#EXTINF:`), 'utf8'),
          }));
        }
      }

      return {
        language: s.language,
        url: s.url,
        variants,
      };
    });

    return {
      languages: languageStreams,
      data: streamMetaData,
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                           FORTNITE BATTLE ROYALE                           */
  /* -------------------------------------------------------------------------- */

  // eslint-disable-next-line no-unused-vars
  public async getBRStats(user: string, startTime?: number, endTime?: number): Promise<StatsData>;
  // eslint-disable-next-line no-unused-vars
  public async getBRStats(user: string[], startTime?: number, endTime?: number, stats?: string[]): Promise<StatsData[]>;

  /**
   * Fetches battle royale v2 stats for one or multiple players
   * @param user The id(s) or display name(s) of the user(s)
   * @param startTime The timestamp to start fetching stats from, can be null/undefined for lifetime
   * @param endTime The timestamp to stop fetching stats from, can be undefined for lifetime
   * @param stats An array of stats keys. Required if you want to get the stats of multiple users at once (If not, ignore this)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {StatsPrivacyError} The user set their stats to private
   * @throws {TypeError} You must provide an array of stats keys for multiple user lookup
   * @throws {EpicgamesAPIError}
   */
  public async getBRStats(user: string | string[], startTime?: number, endTime?: number, stats: string[] = []): Promise<StatsData | StatsData[] | undefined> {
    const params = [];
    if (startTime) params.push(`startTime=${startTime}`);
    if (endTime) params.push(`endTime=${endTime}`);
    const query = params[0] ? `?${params.join('&')}` : '';

    if (typeof user === 'string') {
      const userID = await this.resolveUserId(user);
      if (!userID) throw new UserNotFoundError(user);

      const statsResponse = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_STATS_V2}/account/${userID}${query}`, 'fortnite');

      if (!statsResponse.error && !statsResponse.response) throw new StatsPrivacyError(user);
      if (statsResponse.error) throw statsResponse.error;

      return {
        ...statsResponse.response,
        query: user,
      };
    }

    if (!stats[0]) throw new TypeError('You need to provide an array of stats keys to fetch multiple user\'s stats');

    const ids = await this.resolveUserIds(user);

    const idChunks: { id: string, query: string }[][] = ids.reduce((resArr: any[], id, i) => {
      const chunkIndex = Math.floor(i / 100);
      // eslint-disable-next-line no-param-reassign
      if (!resArr[chunkIndex]) resArr[chunkIndex] = [];
      resArr[chunkIndex].push(id);
      return resArr;
    }, []);

    const statsResponses = await Promise.all(idChunks.map((c) => this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.BR_STATS_V2}/query${query}`, 'fortnite', {
      'Content-Type': 'application/json',
    }, {
      appId: 'fortnite',
      owners: c.map((o) => o.id),
      stats,
    })));

    if (statsResponses.some((r) => r.error)) throw statsResponses.find((r) => r.error)?.error;

    return statsResponses.map((r) => r.response).flat(1).map((r) => ({
      ...r,
      query: ids.find((id) => id.id === r.accountId)?.query,
    }));
  }

  // eslint-disable-next-line no-unused-vars
  public async getNews(mode: 'battleroyale' | 'creative', language: string): Promise<NewsMOTD[]>;
  // eslint-disable-next-line no-unused-vars
  public async getNews(mode: 'savetheworld', language: string): Promise<NewsMessage[]>;

  /**
   * Fetches the current news for a specific gamemode
   * @param mode The gamemode to fetch the news for
   * @param language The language of the news
   * @throws {EpicgamesAPIError}
   */
  public async getNews(mode: 'battleroyale' | 'creative' | 'savetheworld' = 'battleroyale', language = Enums.Language.ENGLISH): Promise<NewsMOTD[] | NewsMessage[]> {
    const news = await this.http.sendEpicgamesRequest(false, 'GET', `${Endpoints.BR_NEWS}/${mode}news${mode === 'savetheworld' ? '' : 'v2'}?lang=${language}`);
    if (news.error) throw news.error;

    const { messages, motds, platform_motds: platformMotds } = news.response.news;

    if (mode === 'savetheworld') return messages;

    const oldNewsMessages: NewsMOTD[] = [...motds, ...(platformMotds || []).filter((m: any) => m.platform === 'windows').map((m: any) => m.message)];

    if (mode === 'creative') return oldNewsMessages;

    const newNews = await this.http.sendEpicgamesRequest(true, 'POST', Endpoints.BR_NEWS_MOTD, 'fortnite', undefined, {
      platform: 'Windows',
      language: 'en',
      country: 'US',
      serverRegion: 'NA',
      subscription: false,
      battlepass: false,
      battlepassLevel: 1,
    });
    if (newNews.error) throw newNews.error;

    const newsMessages: NewsMOTD[] = (newNews.response?.contentItems as any[])?.map((i: any, y) => ({
      _type: i.contentSchemaName,
      body: i.contentFields.body,
      entryType: i.contentFields.entryType,
      hidden: i.contentFields.hidden,
      id: i.contentId,
      image: i.contentFields.image?.[0]?.url,
      offerAction: i.contentFields.offerAction,
      sortingPriority: 1000 - y,
      spotlight: i.contentFields.spotlight,
      tabTitleOverride: i.contentFields.tabTitleOverride,
      tileImage: i.contentFields.tileImage?.[0]?.url,
      title: i.contentFields.title,
      videoAutoplay: i.contentFields.videoAutoplay,
      videoFullscreen: i.contentFields.videoFullscreen,
      videoLoop: i.contentFields.videoLoop,
      videoMute: i.contentFields.videoMute,
      videoStreamingEnabled: i.contentFields.videoStreamingEnabled,
      buttonTextOverride: i.contentFields.buttonTextOverride,
      offerId: i.contentFields.offerId,
      playlistId: i.contentFields.playlistId,
      videoUID: i.contentFields.videoUID,
      videoVideoString: i.contentFields.videoVideoString,
    })) || [];

    oldNewsMessages.forEach((omsg) => {
      if (!newsMessages.some((msg) => msg.title === omsg.title && msg.body === omsg.body)) {
        newsMessages.push(omsg);
      }
    });

    return newsMessages;
  }

  /**
   * Fetches data for a Support-A-Creator code
   * @param code The Support-A-Creator code (slug)
   * @throws {CreatorCodeNotFoundError} The Support-A-Creator code wasnt found
   * @throws {EpicgamesAPIError}
   */
  public async getCreatorCode(code: string): Promise<CreatorCode> {
    const codeResponse = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_SAC}/${encodeURIComponent(code)}`, 'fortniteClientCredentials');

    if (codeResponse.error) {
      if (codeResponse.error.code === 'errors.com.epicgames.ecommerce.affiliate.not_found') throw new CreatorCodeNotFoundError(code);
      throw codeResponse.error;
    }

    const owner = await this.getProfile(codeResponse.response.id);
    return new CreatorCode(this, { ...codeResponse.response, owner });
  }

  /**
   * Fetches the current Fortnite battle royale radio stations
   * @throws {EpicgamesAPIError}
   */
  public async getRadioStations(): Promise<RadioStation[]> {
    const fortniteContent = await this.http.sendEpicgamesRequest(false, 'GET', Endpoints.BR_NEWS);
    if (fortniteContent.error) throw fortniteContent.error;

    const radioStations = fortniteContent.response.radioStations.radioStationList.stations;

    return radioStations.map((s: any) => new RadioStation(this, s));
  }

  /**
   * Fetches the current battle royale event flags
   * @param language The language
   * @throws {EpicgamesAPIError}
   */
  public async getBREventFlags(language = Enums.Language.ENGLISH) {
    const eventFlags = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_EVENT_FLAGS}?lang=${language}`, 'fortnite');
    if (eventFlags.error) throw eventFlags.error;

    return eventFlags.response;
  }

  /**
   * Fetches the battle royale account level for one or multiple users
   * @param user The id(s) and/or display name(s) of the user(s) to fetch the account level for
   * @param seasonNumber The season number (eg. 16, 17, 18)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {StatsPrivacyError} The user set their stats to private
   * @throws {EpicgamesAPIError}
   */
  public async getBRAccountLevel(user: string | string[], seasonNumber: number): Promise<BRAccountLevel[]> {
    if (seasonNumber < 11) throw new RangeError('The season number must be at least 11');

    const users = Array.isArray(user) ? user : [user];

    const accountLevels = await this.getBRStats(users, undefined, undefined, [`s${seasonNumber}_social_bp_level`]);

    return accountLevels.map((al) => ({
      query: al.query,
      level: al.stats[`s${seasonNumber}_social_bp_level`] as number || 0,
    }));
  }

  /**
   * Fetches the storefront keychain
   * @throws {EpicgamesAPIError}
   */
  public async getStorefrontKeychain(): Promise<string[]> {
    const keychain = await this.http.sendEpicgamesRequest(true, 'GET', Endpoints.BR_STORE_KEYCHAIN, 'fortnite');
    if (keychain.error) throw keychain.error;

    return keychain.response;
  }

  /* -------------------------------------------------------------------------- */
  /*                     FORTNITE BATTLE ROYALE TOURNAMENTS                     */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetches the event tokens for an account.
   * This can be used to check if a user is eligible to play a certain tournament window
   * or to check a user's arena division in any season
   * @param user The id(s) or display name(s) of the user(s)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async getEventTokens(user: string | string[]): Promise<EventTokensResponse[]> {
    const users = typeof user === 'string' ? [user] : user;

    const resolvedUsers = await this.getProfile(users);

    const userChunks: string[][] = resolvedUsers.map((u) => u.id).reduce((resArr: any[], usr, i) => {
      const chunkIndex = Math.floor(i / 16);
      // eslint-disable-next-line no-param-reassign
      if (!resArr[chunkIndex]) resArr[chunkIndex] = [];
      resArr[chunkIndex].push(usr);
      return resArr;
    }, []);

    const statsResponses = await Promise.all(userChunks.map((c) => this.http.sendEpicgamesRequest(true, 'GET',
      `${Endpoints.BR_TOURNAMENT_TOKENS}?teamAccountIds=${c.join(',')}`, 'fortnite')));

    return statsResponses.map((r) => r.response.accounts).flat(1).map((r) => ({
      user: resolvedUsers.find((u) => u.id === r.accountId) as User,
      tokens: r.tokens,
    }));
  }

  /**
   * Fetches the current and past battle royale tournaments
   * @param region The region
   * @param platform The platform
   * @throws {EpicgamesAPIError}
   */
  public async getTournaments(region: Region = 'EU', platform: FullPlatform = 'Windows') {
    const [tournaments, tournamentsInfo] = await Promise.all([
      this.http.sendEpicgamesRequest(true, 'GET',
        `${Endpoints.BR_TOURNAMENTS_DOWNLOAD}/${this.user?.id}?region=${region}&platform=${platform}&teamAccountIds=${this.user?.id}`, 'fortnite'),
      this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_NEWS}/tournamentinformation`, 'fortnite'),
    ]);

    if (tournaments.error) throw tournaments.error;
    if (tournamentsInfo.error) throw tournamentsInfo.error;

    const constuctedTournaments: Tournament[] = [];

    tournaments.response.events.forEach((t: TournamentData) => {
      let tournamentDisplayData = tournamentsInfo.response?.tournament_info?.tournaments
        ?.find((td: TournamentDisplayData) => td.tournament_display_id === t.displayDataId);

      if (!tournamentDisplayData) {
        tournamentDisplayData = tournamentsInfo.response?.
          [t.displayDataId.split('_').map((s, i) => (i > 0 ? `${s.charAt(0).toUpperCase()}${s.slice(1)}` : s)).join('')]?.tournament_info;
      }

      if (!tournamentDisplayData) return;

      const templates: TournamentWindowTemplate[] = [];

      t.eventWindows.forEach((w) => {
        const template = tournaments.response.templates.find((tt: TournamentWindowTemplateData) => tt.eventTemplateId === w.eventTemplateId);
        if (template) templates.push({ windowId: w.eventWindowId, templateData: template });
      });

      constuctedTournaments.push(new Tournament(this, t, tournamentDisplayData, templates));
    });

    return constuctedTournaments;
  }

  /**
   * Fetches the results for a tournament window
   * @param eventId The tournament's ID
   * @param eventWindowId The tournament window's ID
   * @param showLiveSessions Whether to show live sessions
   * @param page The results page index
   * @throws {EpicgamesAPIError}
   */
  public async getTournamentWindowResults(eventId: string, eventWindowId: string, showLiveSessions = false, page = 0): Promise<TournamentWindowResults> {
    const window = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.BR_TOURNAMENT_WINDOW}/${eventId}/${eventWindowId}/`
      + `${this.user?.id}?page=${page}&rank=0&teamAccountIds=&appId=Fortnite&showLiveSessions=${showLiveSessions}`,
    'fortnite');
    if (window.error) throw window.error;

    return window.response;
  }

  /**
   * Downloads a tournament replay by its session ID.
   * This method returns a regular Fortnite replay file, can be parsed using https://github.com/ThisNils/node-replay-reader
   * @param sessionId The session ID
   * @param options Replay download and build options
   * @throws {MatchNotFoundError} The match wasn't found
   * @throws {EpicgamesAPIError}
   * @throws {AxiosError}
   */
  public async downloadTournamentReplay(sessionId: string, options: ReplayDownloadOptions) {
    const downloadConfig: ReplayDownloadConfig = {
      dataTypes: ['EVENT', 'DATACHUNK'],
      addStatsPlaceholder: false,
      ...options,
    };

    const replayMetadataResponse = await this.downloadReplayCDNFile(`${Endpoints.BR_REPLAY_METADATA}%2F${sessionId}.json`, 'json');
    if (replayMetadataResponse.error) {
      if (!(replayMetadataResponse.error instanceof EpicgamesAPIError)
        && replayMetadataResponse.error.response?.data.includes('<Message>The specified key does not exist.</Message>')) {
        throw new MatchNotFoundError(sessionId);
      }

      throw replayMetadataResponse.error;
    }

    const replayHeaderResponse = await this.downloadReplayCDNFile(`${Endpoints.BR_REPLAY}%2F${sessionId}%2Fheader.bin`, 'arraybuffer');
    if (replayHeaderResponse.error) throw replayHeaderResponse.error;

    const replayData: ReplayData = replayMetadataResponse.response;
    replayData.Header = replayHeaderResponse.response;

    const downloadKeys = new Set(['Events', 'DataChunks', 'Checkpoints']);

    if (!downloadConfig.dataTypes.includes('EVENT')) {
      downloadKeys.delete('Events');
      delete replayData.Events;
    }

    if (!downloadConfig.dataTypes.includes('DATACHUNK')) {
      downloadKeys.delete('DataChunks');
      delete replayData.DataChunks;
    }

    if (!downloadConfig.dataTypes.includes('CHECKPOINT')) {
      downloadKeys.delete('Checkpoints');
      delete replayData.Checkpoints;
    }

    const promises: Promise<any>[] = [];
    for (const downloadKey of downloadKeys.values()) {
      const chunks = (replayData as any)[downloadKey];
      for (const chunk of chunks) {
        promises.push(this.downloadReplayCDNFile(`${Endpoints.BR_REPLAY}%2F${sessionId}%2F${chunk.Id}.bin`, 'arraybuffer').then((resp) => {
          if (resp.error) throw resp.error;

          chunks.find((d: any) => d.Id === chunk.Id).data = resp.response;
        }));
      }
    }

    await Promise.all(promises);

    return buildReplay(replayData, downloadConfig.addStatsPlaceholder);
  }

  /**
   * Fetches a tournament session's metadata
   * @param sessionId The session ID
   * @throws {MatchNotFoundError} The match wasn't found
   * @throws {EpicgamesAPIError}
   * @throws {AxiosError}
   */
  public async getTournamentSessionMetadata(sessionId: string): Promise<TournamentSessionMetadata> {
    const replayMetadataResponse = await this.downloadReplayCDNFile(`${Endpoints.BR_REPLAY_METADATA}%2F${sessionId}.json`, 'json');
    if (replayMetadataResponse.error) {
      if (!(replayMetadataResponse.error instanceof EpicgamesAPIError)
        && replayMetadataResponse.error.response?.data.includes('<Message>The specified key does not exist.</Message>')) {
        throw new MatchNotFoundError(sessionId);
      }

      throw replayMetadataResponse.error;
    }

    return {
      changelist: replayMetadataResponse.response.Changelist,
      checkpoints: replayMetadataResponse.response.Checkpoints,
      dataChunks: replayMetadataResponse.response.DataChunks,
      desiredDelayInSeconds: replayMetadataResponse.response.DesiredDelayInSeconds,
      events: replayMetadataResponse.response.Events,
      friendlyName: replayMetadataResponse.response.FriendlyName,
      lengthInMS: replayMetadataResponse.response.LengthInMS,
      networkVersion: replayMetadataResponse.response.NetworkVersion,
      replayName: replayMetadataResponse.response.ReplayName,
      timestamp: new Date(replayMetadataResponse.response.Timestamp),
      isCompressed: replayMetadataResponse.response.bCompressed,
      isLive: replayMetadataResponse.response.bIsLive,
    };
  }

  /**
   * Downloads a file from the CDN (used for replays)
   * @param url The URL of the file to download
   * @param responseType The response type
   */
  private async downloadReplayCDNFile(url: string, responseType: ResponseType) {
    const fileLocationInfo = await this.http.sendEpicgamesRequest(true, 'GET', url, 'fortnite');
    if (fileLocationInfo.error) return fileLocationInfo;

    const file = await this.http.send('GET', (Object.values(fileLocationInfo.response.files)[0] as any).readLink, undefined, undefined, undefined, responseType);

    if (file.response) return { response: file.response.data };
    return file;
  }

  /* -------------------------------------------------------------------------- */
  /*                              FORTNITE CREATIVE                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetches a creative island by its code
   * @param code The island code
   * @throws {CreativeIslandNotFoundError} A creative island with the provided code does not exist
   * @throws {EpicgamesAPIError}
   */
  public async getCreativeIsland(code: string): Promise<CreativeIslandData> {
    const islandInfo = await this.http.sendEpicgamesRequest(true, 'GET', `${Endpoints.CREATIVE_ISLAND_LOOKUP}/${code}`, 'fortnite');
    if (islandInfo.error) {
      if (islandInfo.error.code === 'errors.com.epicgames.links.no_active_version') throw new CreativeIslandNotFoundError(code);
      throw islandInfo.error;
    }

    return islandInfo.response;
  }

  /**
   * Fetches the creative discovery surface
   * @param gameVersion The current game version (MAJOR.MINOR)
   * @throws {EpicgamesAPIError}
   */
  public async getCreativeDiscoveryPanels(gameVersion = '18.30'): Promise<CreativeDiscoveryPanel[]> {
    const creativeDiscovery = await this.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.CREATIVE_DISCOVERY}/${this.user?.id}`, 'fortnite', {
      'Content-Type': 'application/json',
      'User-Agent': `Fortnite/++Fortnite+Release-${gameVersion}-CL-00000000 Windows/10`,
    }, {
      surfaceName: 'CreativeDiscoverySurface_Frontend',
      partyMemberIds: [this.user?.id],
    });

    if (creativeDiscovery.error) {
      throw creativeDiscovery.error;
    }

    return creativeDiscovery.response.Panels;
  }
}

export default Client;
