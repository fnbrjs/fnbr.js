/* eslint-disable no-restricted-syntax */
import { EventEmitter } from 'events';
import Enums from '../enums/Enums';
import { consoleQuestion, parseBlurlStream, parseM3U8File } from './util/Util';
import Auth from './auth/Auth';
import Http from './http/HTTP';
import AsyncLock from './util/AsyncLock';
import Endpoints from '../resources/Endpoints';
import XMPP from './xmpp/XMPP';
import Friend from './structures/friend/Friend';
import UserNotFoundError from './exceptions/UserNotFoundError';
import StatsPrivacyError from './exceptions/StatsPrivacyError';
import CreatorCode from './structures/CreatorCode';
import CreatorCodeNotFoundError from './exceptions/CreatorCodeNotFoundError';
import FriendNotFoundError from './exceptions/FriendNotFoundError';
import IncomingPendingFriend from './structures/friend/IncomingPendingFriend';
import OutgoingPendingFriend from './structures/friend/OutgoingPendingFriend';
import BlockedUser from './structures/user/BlockedUser';
import ClientParty from './structures/party/ClientParty';
import Party from './structures/party/Party';
import PartyNotFoundError from './exceptions/PartyNotFoundError';
import PartyPermissionError from './exceptions/PartyPermissionError';
import SentPartyJoinRequest from './structures/party/SentPartyJoinRequest';
import RadioStation from './structures/RadioStation';
import CreativeIslandNotFoundError from './exceptions/CreativeIslandNotFoundError';
import STWProfile from './structures/stw/STWProfile';
import Stats from './structures/Stats';
import NewsMessage from './structures/NewsMessage';
import STWNewsMessage from './structures/stw/STWNewsMessage';
import EventTimeoutError from './exceptions/EventTimeoutError';
import FortniteServerStatus from './structures/FortniteServerStatus';
import EpicgamesServerStatus from './structures/EpicgamesServerStatus';
import TournamentManager from './managers/TournamentManager';
import { AuthSessionStoreKey } from '../resources/enums';
import EpicgamesAPIError from './exceptions/EpicgamesAPIError';
import UserManager from './managers/UserManager';
import FriendManager from './managers/FriendManager';
import type { PresenceShow } from 'stanza/Constants';
import type {
  BlurlStreamData, CreativeIslandData,
  BlurlStreamMasterPlaylistData, CreativeDiscoveryPanel,
} from '../resources/httpResponses';
import type {
  ClientOptions, ClientConfig, ClientEvents, PartyConfig, Schema,
  Region, BlurlStream, STWWorldInfoData, Language, PartyData,
  PartySchema, PresenceOnlineType, BRAccountLevelData,
} from '../resources/structs';

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
   * Lock used to pause certain incoming xmpp messages while the bots party is being modified
   */
  public partyLock: AsyncLock;

  /**
   * Lock used to pause xmpp presences while the friend caches are being populated
   */
  public cacheLock: AsyncLock;

  /**
   * HTTP manager
   */
  public http: Http;

  /**
   * User manager
   */
  public user: UserManager;

  /**
   * Whether the client is fully started
   */
  public isReady: boolean;

  /**
   * XMPP manager
   */
  public xmpp: XMPP;

  /**
   * Friend manager
   */
  public friend: FriendManager;

  /**
   * The client's current party
   */
  public party?: ClientParty;

  /**
   * The client's tournament manager.
   */
  public tournaments: TournamentManager;

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
      defaultOnlineType: Enums.PresenceOnlineType.ONLINE,
      platform: 'WIN',
      defaultPartyMemberMeta: {},
      xmppKeepAliveInterval: 30,
      xmppMaxConnectionRetries: 2,
      createParty: true,
      forceNewParty: true,
      disablePartyService: false,
      connectToXMPP: true,
      fetchFriends: true,
      restRetryLimit: 1,
      handleRatelimits: true,
      partyBuildId: '1:3:',
      restartOnInvalidRefresh: false,
      language: 'en',
      friendOnlineConnectionTimeout: 30000,
      friendOfflineTimeout: 300000,
      ...config,
      cacheSettings: {
        ...config.cacheSettings,
        presences: {
          maxLifetime: Infinity,
          sweepInterval: 0,
          ...config.cacheSettings?.presences,
        },
        users: {
          maxLifetime: 0,
          sweepInterval: 0,
          ...config.cacheSettings?.users,
        },
      },
      auth: {
        authorizationCode: async () => consoleQuestion('Please enter an authorization code: '),
        checkEULA: true,
        killOtherTokens: true,
        createLauncherSession: false,
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

    this.partyLock = new AsyncLock();
    this.cacheLock = new AsyncLock();

    this.isReady = false;

    this.friend = new FriendManager(this);
    this.user = new UserManager(this);

    this.party = undefined;
    this.tournaments = new TournamentManager(this);
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
    await this.auth.authenticate();
    await this.user.fetchSelf();

    this.initCacheSweeping();

    this.cacheLock.lock();
    try {
      if (this.config.connectToXMPP) await this.xmpp.connect();
      if (this.config.fetchFriends) await this.updateCaches();
    } finally {
      this.cacheLock.unlock();
    }

    if (!this.config.disablePartyService) await this.initParty(this.config.createParty, this.config.forceNewParty);
    if (this.xmpp.isConnected) this.setStatus();

    this.isReady = true;
    this.emit('ready');
  }

  /**
   * Logs the client out.
   * Also clears all caches, etc
   */
  public async logout() {
    await this.auth.revokeAllTokens();
    this.xmpp.disconnect();
    this.destroy();
    this.isReady = false;
    this.emit('disconnected');
  }

  /**
   * Restarts the client
   */
  public async restart() {
    const refreshToken = this.auth.sessions.get(AuthSessionStoreKey.Fortnite)?.refreshToken;
    await this.logout();

    this.config.auth.refreshToken = refreshToken;
    await this.login();
    this.config.auth.refreshToken = undefined;
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
   * Internal method that sets a {@link ClientParty} to the value of {@link Client#party}
   * @param party The party
   * @private
   */
  public setClientParty(party: Party) {
    this.party = new ClientParty(this, party);
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
    this.friend.list.clear();
    this.friend.pendingList.clear();
    this.user.blocklist.clear();
    this.user.cache.clear();
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

    const userCacheSettings = cacheSettings.users;
    if (userCacheSettings && userCacheSettings.sweepInterval && userCacheSettings.sweepInterval > 0
      && userCacheSettings.maxLifetime > 0 && userCacheSettings.maxLifetime !== Infinity) {
      this.setInterval(this.sweepUsers.bind(this), userCacheSettings.sweepInterval);
    }
  }

  /**
   * Updates the client's caches
   */
  public async updateCaches() {
    const friendsSummary = await this.http.epicgamesRequest({
      url: `${Endpoints.FRIENDS}/${this.user.self!.id}/summary`,
    }, AuthSessionStoreKey.Fortnite);

    this.friend.list.clear();
    this.friend.pendingList.clear();
    this.user.blocklist.clear();

    friendsSummary.friends.forEach((f: any) => {
      this.friend.list.set(f.accountId, new Friend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.incoming.forEach((f: any) => {
      this.friend.pendingList.set(f.accountId, new IncomingPendingFriend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.outgoing.forEach((f: any) => {
      this.friend.pendingList.set(f.accountId, new OutgoingPendingFriend(this, { ...f, id: f.accountId }));
    });

    friendsSummary.blocklist.forEach((u: any) => {
      this.user.blocklist.set(u.accountId, new BlockedUser(this, { ...u, id: u.accountId }));
    });

    const users = await this.user.fetchMultiple([
      ...this.friend.list.values(),
      ...this.friend.pendingList.values(),
      ...this.user.blocklist.values(),
    ]
      .filter((u) => !!u.id)
      .map((u) => u.id));

    users.forEach((u) => {
      this.friend.list.get(u.id)?.update(u);
      this.friend.pendingList.get(u.id)?.update(u);
      this.user.blocklist.get(u.id)?.update(u);
    });
  }

  /**
   * Removes presences from the client's cache that are older than the max lifetime
   * @param maxLifetime How old a presence cache entry must be before it can be sweeped (in seconds)
   * @returns The amount of presences sweeped
   */
  public sweepPresences(maxLifetime = this.config.cacheSettings.presences?.maxLifetime) {
    if (typeof maxLifetime !== 'number') {
      throw new TypeError('maxLifetime must be typeof number');
    }

    let presences = 0;
    for (const friend of this.friend.list.values()) {
      if (typeof friend.presence?.receivedAt !== 'undefined' && Date.now() - friend.presence.receivedAt.getTime() > maxLifetime * 1000) {
        delete friend.presence;
        presences += 1;
      }
    }

    return presences;
  }

  /**
   * Removes users from the client's cache that are older than the max lifetime
   * @param maxLifetime How old a user cache entry must be before it can be sweeped (in seconds)
   * @returns The amount of users sweeped
   */
  public sweepUsers(maxLifetime = this.config.cacheSettings.users?.maxLifetime) {
    if (typeof maxLifetime !== 'number') {
      throw new TypeError('maxLifetime must be typeof number');
    }

    let users = 0;
    for (const user of this.user.cache.values()) {
      if (Date.now() - user.cachedAt > maxLifetime * 1000) {
        this.user.cache.delete(user.id);
        users += 1;
      }
    }

    return users;
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
  public waitForEvent<U extends keyof ClientEvents>(
    event: U,
    timeout = 5000,
    // eslint-disable-next-line no-unused-vars
    filter?: (...args: Parameters<ClientEvents[U]>) => boolean,
  ): Promise<Parameters<ClientEvents[U]>> {
    return new Promise<any>((res, rej) => {
      // eslint-disable-next-line no-undef
      let rejectionTimeout: NodeJS.Timeout;

      const handler = (...data: any) => {
        if (!filter || filter(...data)) {
          this.removeListener(event, handler);
          if (rejectionTimeout) clearTimeout(rejectionTimeout);
          res(data);
        }
      };

      this.on(event, handler);

      const err = new EventTimeoutError(event, timeout);
      rejectionTimeout = setTimeout(() => {
        this.removeListener(event, handler);
        rej(err);
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
      case 'regular':
        if (typeof this.config.debug === 'function') this.config.debug(message);
        break;
      case 'http':
        if (typeof this.config.httpDebug === 'function') { this.config.httpDebug(message); }
        break;
      case 'xmpp':
        if (typeof this.config.xmppDebug === 'function') { this.config.xmppDebug(message); }
        break;
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                                   STATUS                                   */
  /* -------------------------------------------------------------------------- */

  /**
   * Sets the clients XMPP status
   * @param status The status
   * @param onlineType The presence's online type (eg "away")
   * @param friend A specific friend you want to send this status to
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   */
  public setStatus(status?: string, onlineType?: PresenceOnlineType, friend?: string) {
    let toJID: string | undefined;
    if (friend) {
      const resolvedFriend = this.friend.resolve(friend);
      if (!resolvedFriend) throw new FriendNotFoundError(friend);
      toJID = `${resolvedFriend.id}@${Endpoints.EPIC_PROD_ENV}`;
    }

    // eslint-disable-next-line no-undef-init
    let partyJoinInfoData: { [key: string]: any } | undefined = undefined;
    if (this.party) {
      const partyPrivacy = this.party.config.privacy;
      if (
        partyPrivacy.presencePermission === 'Noone'
        || (partyPrivacy.presencePermission === 'Leader'
          && !this.party.me?.isLeader)
      ) {
        partyJoinInfoData = {
          isPrivate: true,
        };
      } else {
        partyJoinInfoData = {
          sourceId: this.user.self!.displayName,
          sourceDisplayName: this.user.self!.displayName,
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

    if (status && !toJID) this.config.defaultStatus = status;
    if (onlineType && !toJID) this.config.defaultOnlineType = onlineType;

    const rawStatus = {
      Status: status || this.config.defaultStatus || (this.party && `Battle Royale Lobby - ${this.party.size} / ${this.party.maxSize}`)
        || 'Playing Battle Royale',
      bIsPlaying: false,
      bIsJoinable: this.party && !this.party.isPrivate && this.party.size !== this.party.maxSize,
      bHasVoiceSupport: false,
      SessionId: '',
      ProductName: 'Fortnite',
      Properties: {
        'party.joininfodata.286331153_j': partyJoinInfoData,
        FortBasicInfo_j: {
          homeBaseRating: 0,
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

    const rawOnlineType = (onlineType || this.config.defaultOnlineType) === 'online' ? undefined : onlineType || this.config.defaultOnlineType;

    return this.xmpp.sendStatus(
      rawStatus,
      rawOnlineType as PresenceShow | undefined,
      toJID,
    );
  }

  /**
   * Resets the client's XMPP status and online type
   */
  public async resetStatus() {
    this.config.defaultStatus = undefined;
    this.config.defaultOnlineType = 'online';

    return this.setStatus();
  }

  /* -------------------------------------------------------------------------- */
  /*                                   PARTIES                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Sends a party invitation to a friend
   * @param friend The friend that will receive the invitation
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {PartyAlreadyJoinedError} The user is already a member of this party
   * @throws {PartyMaxSizeReachedError} The party reached its max size
   * @throws {PartyNotFoundError} The client is not in party
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
    const party = (await this.getParty(id)) as Party;

    return party.join(true);
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

    let party;
    try {
      party = await this.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.BR_PARTY}/parties`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
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
              'urn:epic:member:dn_s': this.user.self!.displayName,
            },
          },
          meta: {
            'urn:epic:cfg:party-type-id_s': 'default',
            'urn:epic:cfg:build-id_s': '1:3:',
            'urn:epic:cfg:join-request-action_s': 'Manual',
            'urn:epic:cfg:chat-enabled_b':
              partyConfig.chatEnabled?.toString() || 'true',
            'urn:epic:cfg:can-join_b': 'true',
          },
        },
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      this.partyLock.unlock();
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.social.party.user_has_party') {
        await this.leaveParty(false);
        return this.createParty(config);
      }

      throw e;
    }

    this.party = new ClientParty(this, party);

    const newPrivacy = await this.party.setPrivacy(partyConfig.privacy || Enums.PartyPrivacy.PUBLIC, false);

    await this.party.sendPatch({
      ...newPrivacy.updated,
      ...Object.keys(this.party.meta.schema)
        .filter((k: string) => !k.startsWith('urn:'))
        .reduce((obj, key) => {
          // eslint-disable-next-line no-param-reassign
          (obj as any)[key] = this.party?.meta.schema[key as keyof PartySchema];
          return obj;
        }, {}),
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
    if (!this.party) return undefined;

    return this.party.leave(createNew);
  }

  /**
   * Sends a party join request to a friend.
   * When the friend confirms this, a party invite will be sent to the client
   * @param friend The friend
   * @throws {FriendNotFoundError} The user does not exist or is not friends with the client
   * @throws {PartyNotFoundError} The friend is not in a party
   * @throws {EpicgamesAPIError}
   */
  public async sendRequestToJoin(friend: string) {
    const resolvedFriend = this.friend.list.find((f: Friend) => f.displayName === friend || f.id === friend);
    if (!resolvedFriend) throw new FriendNotFoundError(friend);

    let intention;
    try {
      intention = await this.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.BR_PARTY}/members/${resolvedFriend.id}/intentions/${this.user.self!.id}`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          'urn:epic:invite:platformdata_s': '',
        },
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.social.party.user_has_no_party') {
        throw new PartyNotFoundError();
      }

      throw e;
    }

    return new SentPartyJoinRequest(this, this.user.self!, resolvedFriend, intention);
  }

  /**
   * Fetches the client's party
   * @throws {EpicgamesAPIError}
   */
  public async getClientParty() {
    const party = await this.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_PARTY}/user/${this.user.self!.id}`,
    }, AuthSessionStoreKey.Fortnite);

    if (!party?.current[0]) return undefined;
    return new ClientParty(this, party.current[0]);
  }

  /**
   * Fetches a party by its id
   * @param id The party's id
   * @param raw Whether to return the raw party data
   * @throws {PartyNotFoundError} The party wasn't found
   * @throws {PartyPermissionError} The party cannot be fetched due to a permission error
   * @throws {EpicgamesAPIError}
   */
  public async getParty(id: string, raw = false): Promise<Party | PartyData> {
    let party;
    try {
      party = await this.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.BR_PARTY}/parties/${id}`,
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError) {
        if (e.code === 'errors.com.epicgames.social.party.party_not_found') {
          throw new PartyNotFoundError();
        }

        if (e.code === 'errors.com.epicgames.social.party.party_query_forbidden') {
          throw new PartyPermissionError();
        }
      }

      throw e;
    }

    if (raw) return party;

    const constuctedParty = new Party(this, party);
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
  public async getFortniteServerStatus(): Promise<FortniteServerStatus> {
    const fortniteServerStatus = await this.http.epicgamesRequest({
      method: 'GET',
      url: Endpoints.BR_SERVER_STATUS,
    }, AuthSessionStoreKey.Fortnite);

    return new FortniteServerStatus(this, fortniteServerStatus[0]);
  }

  /**
   * Fetches the current epicgames server status (https://status.epicgames.com/)
   * @throws {AxiosError}
   */
  public async getEpicgamesServerStatus(): Promise<EpicgamesServerStatus> {
    const epicgamesServerStatus = await this.http.request({
      method: 'GET',
      url: Endpoints.SERVER_STATUS_SUMMARY,
    });

    if (!epicgamesServerStatus) {
      throw new Error('Request returned an empty body');
    }

    return new EpicgamesServerStatus(this, epicgamesServerStatus.data);
  }

  /**
   * Fetches the current Fortnite storefronts
   * @param language The language
   * @throws {EpicgamesAPIError}
   */
  public async getStorefronts(language: Language = 'en') {
    const store = await this.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_STORE}?lang=${language}`,
    }, AuthSessionStoreKey.Fortnite);

    return store.storefronts;
  }

  /**
   * Downloads a blurl stream (eg a radio station stream or a news video)
   * @param id The stream ID
   * @throws {AxiosError}
   */
  public async downloadBlurlStream(id: string): Promise<BlurlStream> {
    const blurlFile = await this.http.request({
      method: 'GET',
      url: `${Endpoints.BR_STREAM}/${id}/master.blurl`,
      responseType: 'arraybuffer',
    });

    const streamData: BlurlStreamData = await parseBlurlStream(blurlFile.data);

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
        type: ss.data.RESOLUTION ? 'video' : 'audio',
        url: `${baseURL || ''}${ss.url}`,
        stream: streamData.playlists
          .find((p) => p.type === 'variant' && p.rel_url === ss.url)?.data.split(/\n/)
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
  public async getBRStats(user: string, startTime?: number, endTime?: number): Promise<Stats>;
  // eslint-disable-next-line no-unused-vars
  public async getBRStats(user: string[], startTime?: number, endTime?: number, stats?: string[]): Promise<Stats[]>;

  /**
   * Fetches Battle Royale v2 stats for one or multiple players
   * @param user The id(s) or display name(s) of the user(s)
   * @param startTime The timestamp in seconds to start fetching stats from, can be null/undefined for lifetime
   * @param endTime The timestamp in seconds to stop fetching stats from, can be undefined for lifetime
   * @param stats An array of stats keys. Required if you want to get the stats of multiple users at once (If not, ignore this)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {StatsPrivacyError} The user set their stats to private
   * @throws {TypeError} You must provide an array of stats keys for multiple user lookup
   * @throws {EpicgamesAPIError}
   */
  public async getBRStats(user: string | string[], startTime?: number, endTime?: number, stats: string[] = []): Promise<Stats | Stats[] | undefined> {
    const params = [];
    if (startTime) params.push(`startTime=${startTime}`);
    if (endTime) params.push(`endTime=${endTime}`);
    const query = params[0] ? `?${params.join('&')}` : '';

    if (typeof user === 'string') {
      const resolvedUser = await this.user.fetch(user);
      if (!resolvedUser) throw new UserNotFoundError(user);

      let statsResponse;
      try {
        statsResponse = await this.http.epicgamesRequest({
          method: 'GET',
          url: `${Endpoints.BR_STATS_V2}/account/${resolvedUser.id}${query}`,
        }, AuthSessionStoreKey.Fortnite);
      } catch (e) {
        if (e instanceof EpicgamesAPIError) {
          throw new StatsPrivacyError(user);
        }

        throw e;
      }

      return new Stats(this, statsResponse, resolvedUser);
    }

    if (!stats[0]) {
      throw new TypeError('You need to provide an array of stats keys to fetch multiple user\'s stats');
    }

    const resolvedUsers = await this.user.fetchMultiple(user);

    const idChunks: string[][] = resolvedUsers
      .map((u) => u.id)
      .reduce((resArr: any[], id, i) => {
        const chunkIndex = Math.floor(i / 51);
        // eslint-disable-next-line no-param-reassign
        if (!resArr[chunkIndex]) resArr[chunkIndex] = [];
        resArr[chunkIndex].push(id);
        return resArr;
      }, []);

    const statsResponses = await Promise.all(idChunks.map((c) => this.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.BR_STATS_V2}/query${query}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        appId: 'fortnite',
        owners: c,
        stats,
      },
    }, AuthSessionStoreKey.Fortnite)));

    return statsResponses
      .flat(1)
      .map((r) => new Stats(this, r, resolvedUsers.find((u) => u.id === r.accountId)!));
  }

  /**
   * Fetches the current Battle Royale news
   * @param language The language of the news
   * @param customPayload Extra data to send in the request body for a personalized news response (battle pass level, country, etc)
   * @throws {EpicgamesAPIError}
   */
  public async getBRNews(language = Enums.Language.ENGLISH, customPayload?: any): Promise<NewsMessage[]> {
    const news = await this.http.epicgamesRequest({
      method: 'POST',
      url: Endpoints.BR_NEWS,
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': language,
      },
      data: {
        platform: 'Windows',
        language,
        country: 'US',
        serverRegion: 'NA',
        subscription: false,
        battlepass: false,
        battlepassLevel: 1,
        ...customPayload,
      },
    }, AuthSessionStoreKey.Fortnite);

    return news.contentItems.map((i: any) => new NewsMessage(this, i));
  }

  /**
   * Fetches data for a Support-A-Creator code
   * @param code The Support-A-Creator code (slug)
   * @throws {CreatorCodeNotFoundError} The Support-A-Creator code wasnt found
   * @throws {EpicgamesAPIError}
   */
  public async getCreatorCode(code: string): Promise<CreatorCode> {
    let codeResponse;
    try {
      codeResponse = await this.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.BR_SAC}/${encodeURIComponent(code)}`,
      }, AuthSessionStoreKey.FortniteClientCredentials);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.ecommerce.affiliate.not_found') {
        throw new CreatorCodeNotFoundError(code);
      }

      throw e;
    }

    const owner = await this.user.fetch(codeResponse.id);
    return new CreatorCode(this, { ...codeResponse, owner });
  }

  /**
   * Fetches the current Fortnite Battle Royale radio stations
   * @throws {EpicgamesAPIError}
   */
  public async getRadioStations(): Promise<RadioStation[]> {
    const fortniteContent = await this.http.epicgamesRequest({
      method: 'GET',
      url: Endpoints.BR_NEWS,
    });

    const radioStations = fortniteContent.radioStations.radioStationList.stations;

    return radioStations.map((s: any) => new RadioStation(this, s));
  }

  /**
   * Fetches the current Battle Royale event flags
   * @param language The language
   * @throws {EpicgamesAPIError}
   */
  public async getBREventFlags(language: Language = 'en') {
    const eventFlags = await this.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_EVENT_FLAGS}?lang=${language}`,
    }, AuthSessionStoreKey.Fortnite);

    return eventFlags;
  }

  /**
   * Fetches the Battle Royale account level for one or multiple users
   * @param user The id(s) and/or display name(s) of the user(s) to fetch the account level for
   * @param seasonNumber The season number (eg. 16, 17, 18)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {StatsPrivacyError} The user set their stats to private
   * @throws {EpicgamesAPIError}
   */
  public async getBRAccountLevel(user: string | string[], seasonNumber: number): Promise<BRAccountLevelData[]> {
    const users = Array.isArray(user) ? user : [user];

    const accountLevels = await this.getBRStats(users, undefined, undefined, [`s${seasonNumber}_social_bp_level`]);

    return accountLevels.map((al) => ({
      user: al.user,
      level: al.levelData[`s${seasonNumber}`] || { level: 0, progress: 0 },
    }));
  }

  /**
   * Fetches the storefront keychain
   * @throws {EpicgamesAPIError}
   */
  public async getStorefrontKeychain(): Promise<string[]> {
    const keychain = await this.http.epicgamesRequest({
      method: 'GET',
      url: Endpoints.BR_STORE_KEYCHAIN,
    }, AuthSessionStoreKey.Fortnite);

    return keychain;
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
    let islandInfo;
    try {
      islandInfo = await this.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.CREATIVE_ISLAND_LOOKUP}/${code}`,
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.links.no_active_version') {
        throw new CreativeIslandNotFoundError(code);
      }

      throw e;
    }

    return islandInfo;
  }

  /**
   * Fetches the creative discovery surface
   * @param gameVersion The current game version (MAJOR.MINOR)
   * @throws {EpicgamesAPIError}
   */
  // kept for backwards compatibility
  // eslint-disable-next-line @typescript-eslint/default-param-last
  public async getCreativeDiscoveryPanels(gameVersion = '19.40', region: Region): Promise<CreativeDiscoveryPanel[]> {
    const creativeDiscovery = await this.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.CREATIVE_DISCOVERY}/${this.user.self!.id}?appId=Fortnite`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `Fortnite/++Fortnite+Release-${gameVersion}-CL-00000000 Windows/10.0.19044.1.768.64bit`,
      },
      data: {
        surfaceName: 'CreativeDiscoverySurface_Frontend',
        revision: -1,
        partyMemberIds: [this.user.self!.id],
        matchmakingRegion: region,
      },
    }, AuthSessionStoreKey.Fortnite);

    return creativeDiscovery;
  }

  /* -------------------------------------------------------------------------- */
  /*                           FORTNITE SAVE THE WORLD                          */
  /* -------------------------------------------------------------------------- */

  /**
   * Fetches the Save The World profile for a players
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async getSTWProfile(user: string) {
    const resolvedUser = await this.user.fetch(user);
    if (!resolvedUser) throw new UserNotFoundError(user);

    let queryProfileResponse;
    try {
      queryProfileResponse = await this.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.MCP}/${resolvedUser.id}/public/QueryPublicProfile?profileId=campaign`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {},
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.modules.profiles.profile_not_found') {
        throw new UserNotFoundError(user);
      }

      throw e;
    }

    return new STWProfile(this, queryProfileResponse.profileChanges[0].profile, resolvedUser);
  }

  /**
   * Fetches the current Save The World news
   * @param language The language of the news
   * @throws {EpicgamesAPIError}
   */
  public async getSTWNews(language = this.config.language): Promise<STWNewsMessage[]> {
    const newsResponse = await this.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_NEWS}/savetheworldnews?lang=${language}`,
      headers: {
        'Accept-Language': language,
      },
    }, AuthSessionStoreKey.Fortnite);

    return newsResponse.news.messages.map((m: any) => new STWNewsMessage(this, m));
  }

  /**
   * Fetches the current Save The World world info
   * @param language The language of the world info
   * @throws {EpicgamesAPIError}
   */
  public async getSTWWorldInfo(language = this.config.language): Promise<STWWorldInfoData> {
    const worldInfoResponse = await this.http.epicgamesRequest({
      method: 'GET',
      url: Endpoints.STW_WORLD_INFO,
      headers: {
        'Accept-Language': language,
      },
    }, AuthSessionStoreKey.Fortnite);

    return {
      theaters: worldInfoResponse.theaters,
      missions: worldInfoResponse.missions,
      missionAlerts: worldInfoResponse.missionAlerts,
    };
  }
}

export default Client;
