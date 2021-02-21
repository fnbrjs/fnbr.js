/* eslint-disable class-methods-use-this */
/* eslint-disable no-param-reassign */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-confusing-arrow */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
const { EventEmitter } = require('events');
const { createInterface } = require('readline');
const onExit = require('async-exit-hook');
const zlib = require('zlib');
const Authenticator = require('./Authenticator');
const XMPP = require('./XMPP');
const HTTP = require('./HTTP');
const Endpoints = require('../../resources/Endpoints');
const ClientUser = require('../structs/ClientUser');
const FriendManager = require('./managers/FriendManager');
const Friend = require('../structs/Friend');
const BlockedUser = require('../structs/BlockedUser');
const PendingFriend = require('../structs/PendingFriend');
const User = require('../structs/User');
const CreatorCode = require('../structs/CreatorCode');
const Enums = require('../../enums');
const FriendMessage = require('../structs/FriendMessage');
const Party = require('../structs/Party');
const News = require('../structs/News');
const BRShop = require('../structs/BRShop');
const { ClientOptions } = require('../../resources/Constants');

/**
 * The main client
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {
  /**
   * @param {ClientOptions} args Client options
   */
  constructor(args = {}) {
    super();
    /**
     * The config of the client
     * @type {ClientOptions}
     */
    this.config = Client.mergeDefault(ClientOptions, args);

    /**
     * Whether the client is ready or not
     * @type {boolean}
     */
    this.isReady = false;

    /**
     * The default party member meta of the client
     * @type {?Object}
     * @private
     */
    this.lastMemberMeta = this.config.memberMeta;

    /**
     * The user of the client
     * @type {?ClientUser}
     */
    this.user = undefined;

    /**
     * The party that the client is currently in
     * @type {?Party}
     */
    this.party = undefined;

    /**
     * The authentication manager of the client
     * @type {Authenticator}
     * @private
     */
    this.auth = new Authenticator(this);
    /**
     * The HTTP manager of the client
     * @type {HTTP}
     * @private
     */
    this.http = new HTTP(this);
    /**
     * The XMPP manager of the client
     * @type {XMPP}
     * @private
     */
    this.xmpp = new XMPP(this);
    /**
     * The friend manager of the client
     * @type {FriendManager}
     */
    this.friends = new FriendManager();

    /**
     * The client's party lock
     * Used for delaying all party-related xmpp events while changes to client's party are made
     * @typedef {Object} PartyLock
     * @property {boolean} active Indicates if the party lock is active
     * @property {function} wait Sleep until party lock is no longer active
     * @private
     */
    this.partyLock = {
      active: false,
      wait: () => new Promise((res) => {
        if (!this.partyLock.active) res();
        const waitInterval = setInterval(() => {
          if (!this.partyLock.active) {
            clearInterval(waitInterval);
            res();
          }
        }, 100);
      }),
    };

    /**
     * The client's reauthentication lock
     * Used for delaying all Http requests while the client is reauthenticating
     * @typedef {Object} ReauthLock
     * @property {boolean} active Indicates if the reauthentication lock is active
     * @property {function} wait Sleep until reauthentication lock is no longer active
     * @private
     */
    this.reauthLock = {
      active: false,
      wait: () => new Promise((res) => {
        if (!this.reauthLock.active) res();
        const waitInterval = setInterval(() => {
          if (!this.reauthLock.active) {
            clearInterval(waitInterval);
            res();
          }
        }, 100);
      }),
    };

    /**
     * Parses an error
     * @param {Object|string} error The error to be parsed
     * @private
     */
    this.parseError = (error) => typeof error === 'object' ? JSON.stringify(error) : error;

    /**
     * Converts an object's keys to camel case
     * @param {Object} obj The object to be converted
     * @private
     */
    this.makeCamelCase = Client.makeCamelCase;

    onExit(async (callback) => {
      await this.logout();
      callback();
    });
  }

  // -------------------------------------GENERAL-------------------------------------

  /**
   * Initiates client's login process
   * @returns {Promise<void>}
   */
  async login() {
    const auth = await this.auth.authenticate();
    if (!auth.success) throw new Error(`Authentification failed: ${this.parseError(auth.response)}`);

    this.tokenCheckInterval = setInterval(() => this.auth.refreshToken(true), 10 * 60000);

    const clientInfo = await this.http.send(false, 'GET', `${Endpoints.ACCOUNT_ID}/${this.auth.account.id}`, `bearer ${this.auth.auths.token}`);
    if (!clientInfo.success) throw new Error(`Client account lookup failed: ${this.parseError(clientInfo.response)}`);
    this.user = new ClientUser(this, clientInfo.response);

    await this.updateCache();

    this.xmpp.setup();

    const xmpp = await this.xmpp.connect();
    if (!xmpp.success) throw new Error(`XMPP-client connecting failed: ${this.parseError(xmpp.response)}`);

    await this.initParty();

    this.isReady = true;
    this.emit('ready');
  }

  /**
   * Disconnects the client
   * @returns {Promise<void>}
   */
  async logout() {
    if (this.tokenCheckInterval) clearInterval(this.tokenCheckInterval);
    if (this.xmpp.connected) await this.xmpp.disconnect();
    if (this.party) {
      try {
        await this.party.leave(false);
      } catch (err) {
        // ignore party leave errors on logout
      }
    }
    if (this.auth.auths.token) await this.http.send(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL}/${this.auth.auths.token}`, `bearer ${this.auth.auths.token}`);

    this.auth.auths.token = undefined;
    this.auth.auths.expires_at = undefined;

    this.friends.cache.clear();
    this.friends.pending.cache.clear();
    this.friends.blocked.cache.clear();

    this.isReady = false;
  }

  /**
   * Restarts the client
   * @returns {Promise<void>}
   */
  async restart() {
    await this.logout();
    await this.login();
  }

  /**
   * Refreshes the client's friends (including pending and blocked)
   * @returns {Promise<void>}
   * @private
   */
  async updateCache() {
    const [rawFriends, friendsSummary] = await Promise.all([
      this.http.send(true, 'GET', `${Endpoints.FRIENDS}/public/friends/${this.user.id}?includePending=true`, `bearer ${this.auth.auths.token}`),
      this.http.send(true, 'GET', `${Endpoints.FRIENDS}/v1/${this.user.id}/summary?displayNames=true`, `bearer ${this.auth.auths.token}`),
    ]);

    if (!rawFriends.success) throw new Error(`Cannot update friend cache: ${this.parseError(rawFriends.response)}`);
    if (!friendsSummary.success) throw new Error(`Cannot update friend cache: ${this.parseError(friendsSummary.response)}`);

    const friends = {};
    const pending = {};
    const blocked = {};
    for (const rawFriend of rawFriends.response) {
      if (rawFriend.status === 'ACCEPTED') friends[rawFriend.accountId] = rawFriend;
      else if (rawFriend.status === 'PENDING') pending[rawFriend.accountId] = rawFriend;
      else if (rawFriend.status === 'BLOCKED') blocked[rawFriend.accountId] = rawFriend;
    }

    this.friends.cache.clear();
    this.friends.pending.cache.clear();
    this.friends.blocked.cache.clear();

    for (const friend of friendsSummary.response.friends) {
      this.friends.add(new Friend(this, { ...friends[friend.accountId], ...friend }));
    }

    for (const blockedUser of friendsSummary.response.blocklist) {
      this.friends.blocked.add(new BlockedUser(this, { ...blocked[blockedUser.accountId], ...blockedUser }));
    }

    for (const incomingFriend of friendsSummary.response.incoming) {
      this.friends.pending.add(new PendingFriend(this, { ...pending[incomingFriend.accountId], ...incomingFriend, direction: 'INCOMING' }));
    }
    for (const outgoingFriend of friendsSummary.response.outgoing) {
      this.friends.pending.add(new PendingFriend(this, { ...pending[outgoingFriend.accountId], ...outgoingFriend, direction: 'OUTGOING' }));
    }
  }

  /**
   * Initiates a party
   * @param {boolean} create Whether to create a new party if the bot is already member of a party
   * @returns {Promise<void>}
   * @private
   */
  async initParty(create = true) {
    this.party = await Party.LookupSelf(this);
    if (create && this.party) await this.party.leave(false);
    if (!this.party) await Party.Create(this);
  }

  // -------------------------------------UTIL-------------------------------------

  /**
   * Debug a message via the debug function provided in the client's config (if provided)
   * @param {string} message The message that will be debugged
   * @returns {void}
   * @private
   */
  debug(message) {
    if (this.config.debug) this.config.debug(message);
  }

  /**
   * Convert an object's keys to camel case
   * @param {Object} obj The object that will be converted
   * @returns {Object} The converted object
   * @private
   */
  static makeCamelCase(obj) {
    const returnObj = {};
    for (const key of Object.keys(obj)) {
      returnObj[key.split('_').map((s, i) => {
        if (i > 0) return `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
        return s;
      }).join('')] = obj[key];
    }
    return returnObj;
  }

  /**
   * Sleep until an event is emitted
   * @param {string|symbol} event The event will be waited for
   * @param {number} [timeout=5000] The timeout (in milliseconds)
   * @param {function} [filter] The filter for the event
   * @returns {Promise<Object>}
   */
  waitForEvent(event, timeout = 5000, filter) {
    return new Promise((res, rej) => {
      this.once(event, (eventData) => {
        if (!filter || filter(eventData)) res(eventData);
      });
      setTimeout(() => rej(new Error('Event timeout exceed')), timeout);
    });
  }

  /**
   * Sleep for the provided milliseconds
   * @param {number} timeout The timeout (in milliseconds)
   * @returns {Promise<void>}
   * @private
   */
  static sleep(timeout) {
    return new Promise((res) => setTimeout(res, timeout));
  }

  /**
   * Display a console prompt
   * @param {string} question The text that will be prompted
   * @returns {Promise<string>} The received answer
   * @private
   */
  static consoleQuestion(question) {
    const itf = createInterface(process.stdin, process.stdout);
    return new Promise((res) => itf.question(question, (answer) => {
      itf.close(); res(answer);
    }));
  }

  /**
   * Sleep until the client is ready
   * @param {number} [timeout=20000] The timeout (in milliseconds)
   */
  waitUntilReady(timeout = 20000) {
    return new Promise((res, rej) => {
      if (this.isReady) res();
      const waitInterval = setInterval(() => {
        if (this.isReady) {
          clearInterval(waitInterval);
          res();
        }
      }, 250);
      setTimeout(() => rej(new Error('Waiting for ready timeout exceed')), timeout);
    });
  }

  /**
   * Merges a default object with a given one
   * @param {Object} def The default object
   * @param {Object} given The given object
   * @returns {Object} The merged objects
   * @private
   */
  static mergeDefault(def, given) {
    if (!given) return def;
    for (const key in def) {
      if (!Object.prototype.hasOwnProperty.call(given, key) || given[key] === undefined) {
        given[key] = def[key];
      } else if (given[key] === Object(given[key])) {
        given[key] = Client.mergeDefault(def[key], given[key]);
      }
    }
    return given;
  }

  /**
   * Merges a default object with a given one
   * @param {Object} def The default object
   * @param {Object} given The given object
   * @returns {Object} The merged objects
   * @private
   */
  mergeDefault(def, given) {
    return Client.mergeDefault(def, given);
  }

  // -------------------------------------ACCOUNT-------------------------------------

  /**
   * Fetches an Epic Games account
   * @param {string|Array<string>} query The id, name or email of the account(s) you want to fetch
   * @returns {Promise<User>|Promise<Array<User>>} The fetched account(s)
   * @example
   * client.getProfile('aabbccddeeff00112233445566778899');
   */
  async getProfile(query) {
    let user;
    if (typeof query === 'string') {
      if (/.*@.*\..*/.test(query)) user = await this.http.send(true, 'GET', `${Endpoints.ACCOUNT_EMAIL}/${encodeURI(query)}`, `bearer ${this.auth.auths.token}`);
      else if (query.length === 32) user = await this.http.send(true, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${query}`, `bearer ${this.auth.auths.token}`);
      else user = await this.http.send(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURI(query)}`, `bearer ${this.auth.auths.token}`);

      return user.success ? new User(this, Array.isArray(user.response) ? user.response[0] : user.response) : undefined;
    } if (query instanceof Array) {
      const ids = [];
      const names = [];
      const emails = [];

      for (const userQuery of query) {
        if (/.*@.*\..*/.test(userQuery)) emails.push(userQuery);
        else if (userQuery.length === 32) ids.push(userQuery);
        else names.push(userQuery);
      }

      const nameResults = (await Promise.all(names.map((name) => this.http.send(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURI(name)}`, `bearer ${this.auth.auths.token}`))))
        .filter((name) => name.success).map((name) => new User(this, name.response));
      const emailResults = (await Promise.all(emails.map((email) => this.http.send(true, 'GET', `${Endpoints.ACCOUNT_EMAIL}/${encodeURI(email)}`, `bearer ${this.auth.auths.token}`))))
        .filter((email) => email.success).map((email) => new User(this, email.response));
      let idResults = await this.http.send(true, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${ids.join('&accountId=')}`, `bearer ${this.auth.auths.token}`);
      if (idResults.success) idResults = idResults.response.map((idr) => new User(this, idr));
      else idResults = [];

      const results = [];
      nameResults.forEach((nr) => results.push(nr));
      emailResults.forEach((er) => results.push(er));
      idResults.forEach((ir) => results.push(ir));

      return results;
    } throw new TypeError(`${typeof query} is not a valid account query type`);
  }

  /**
   * Changes the presence status
   * @param {string} [status] The status message; can be null/undefined if you want to reset it
   * @param {string} [to] The display name or the id of the friend; can be undefined if you want to update the presence status for all friends
   * @returns {Promise<void>}
   */
  setStatus(status, to) {
    let id;
    if (to) {
      const cachedFriend = this.friends.cache.find((f) => f.id === to || f.displayName === to);
      if (!cachedFriend) throw new Error(`Failed sending a status to ${to}: Friend not existing`);
      id = this.xmpp.sendStatus(status, `${cachedFriend.id}@${Endpoints.EPIC_PROD_ENV}`);
      return undefined;
    }
    this.config.status = status;
    id = this.xmpp.sendStatus(status);
    return new Promise((res, rej) => {
      this.xmpp.stream.on(`presence#${id}:sent`, () => res());
      setTimeout(() => rej(new Error('Failed sending a status: Status timeout of 20000ms exceeded')), 20000);
    });
  }

  // -------------------------------------FRIENDS-------------------------------------

  /**
   * Sends / accepts a friend request to an Epic Games user
   * @param {string} user The id, name or email of the user
   * @returns {Promise<void>}
   */
  async addFriend(user) {
    let userId;
    if (user.length === 32 && !user.includes('@')) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Adding ${user} as a friend failed: Account not found`);
      userId = lookedUpUser.id;
    }
    const userRequest = await this.http.send(true, 'POST', `${Endpoints.FRIEND_ADD}/${this.user.id}/${userId}`, `bearer ${this.auth.auths.token}`);
    if (!userRequest.success) throw new Error(`Adding ${userId} as a friend failed: ${this.parseError(userRequest.response)}`);
  }

  /**
   * Removes a friend or reject an user's friend request
   * @param {string} user The id, name or email of the user
   * @returns {Promise<void>}
   */
  async removeFriend(user) {
    let userId;
    if (user.length === 32 && !user.includes('@')) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Removing ${user} as a friend failed: Account not found`);
      userId = lookedUpUser.id;
    }
    const userRequest = await this.http.send(true, 'DELETE', `${Endpoints.FRIEND_DELETE}/${this.user.id}/friends/${userId}`, `bearer ${this.auth.auths.token}`);
    if (!userRequest.success) throw new Error(`Removing ${user} as a friend failed: ${this.parseError(userRequest.response)}`);
  }

  /**
   * Blocks a user
   * @param {string} user The id, name or email of the user
   * @returns {Promise<void>}
   */
  async blockUser(user) {
    const profile = await this.getProfile(user);
    if (!profile) throw new Error(`Blocking ${user} failed: User doesn't exist`);

    const blockListUpdate = await this.http.send(true, 'POST', `${Endpoints.FRIEND_BLOCK}/${this.user.id}/${profile.id}`, `bearer ${this.auth.auths.token}`);
    if (!blockListUpdate.success) throw new Error(`Blocking ${user} failed: ${this.parseError(blockListUpdate.response)}`);
  }

  /**
   * Unblocks a user
   * @param {string} user The id, name or email of the user
   * @returns {Promise<void>}
   */
  async unblockUser(user) {
    const cachedBlockedUser = this.friends.blocked.cache.find((u) => u.id === user || u.displayName === user);
    if (!cachedBlockedUser) throw new Error(`Unblocking ${user} failed: User not in the blocklist`);

    const blockListUpdate = await this.http.send(true, 'DELETE', `${Endpoints.FRIEND_BLOCK}/${this.user.id}/${cachedBlockedUser.id}`, `bearer ${this.auth.auths.token}`);
    if (!blockListUpdate.success) throw new Error(`Unblocking ${user} failed: ${this.parseError(blockListUpdate.response)}`);
  }

  /**
   * Sends a message to a friend
   * @param {string} friend The id or name of the friend
   * @param {string} message The message
   * @returns {Promise<FriendMessage>} The sent friend message
   */
  async sendFriendMessage(friend, message) {
    if (!message) throw new Error(`Failed sending a friend message to ${friend}: Cannot send an empty message`);
    const cachedFriend = this.friends.cache.find((f) => f.id === friend || f.displayName === friend);
    if (!cachedFriend) throw new Error(`Failed sending a friend message to ${friend}: Friend not existing`);
    const id = this.xmpp.stream.sendMessage({
      to: `${cachedFriend.id}@${Endpoints.EPIC_PROD_ENV}`,
      type: 'chat',
      body: message,
    });

    return new Promise((res, rej) => {
      this.xmpp.stream.once(`message#${id}:sent`, () => res(new FriendMessage(this, { body: message, author: this.user })));
      setTimeout(() => rej(new Error(`Failed sending a friend message to ${friend}: Message timeout of 20000ms exceeded`)), 20000);
    });
  }

  /**
   * Sends a party invitation to a friend
   * @param {string} friend The id or name of the friend
   * @returns {Promise<SentPartyInvitation>}
   */
  async invite(friend) {
    return this.party.invite(friend);
  }

  // -------------------------------------BATTLE ROYALE-------------------------------------

  /**
   * Fetches news for a gamemode
   * @param {Gamemode} mode The gamemode
   * @param {Language} language The language
   * @returns {Promise<Array<News>>}
   */
  async getNews(mode = Enums.Gamemode.BATTLE_ROYALE, language = Enums.Language.ENGLISH) {
    if (!Object.values(Enums.Gamemode).includes(mode)) throw new Error(`Fetching news failed: ${mode} is not a valid gamemode! Use the enum`);
    const gamemodeNews = await this.http.send(false, 'GET', `${Endpoints.BR_NEWS}/${mode}news${mode === 'savetheworld' ? '' : 'v2'}?lang=${language}`);
    if (!gamemodeNews.success) throw new Error(`Fetching news failed: ${this.parseError(gamemodeNews.response)}`);

    const { messages, motds, platform_motds: platformMotds } = gamemodeNews.response.news;

    if (mode === 'savetheworld') return messages.map((m) => new News(this, m));
    return [...motds, ...(platformMotds || []).filter((m) => m.platform === 'windows').map((m) => m.message)].map((m) => new News(this, m));
  }

  /**
   * Fetches v2 stats for one or multiple players
   * @param {string} user The id, name or email of the user
   * @param {number} [startTime] The timestamp to start fetching stats from; can be null/undefined for lifetime
   * @param {number} [endTime] The timestamp to stop fetching stats from; can be undefined for lifetime
   * @returns {Promise<Object>}
   */
  async getBRStats(user, startTime, endTime) {
    let userId;
    if (user.length === 32 && !user.includes('@')) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Fetching ${user}'s stats failed: Account not found`);
      userId = lookedUpUser.id;
    }

    const params = [];
    if (startTime) params.push(`startTime=${startTime}`);
    if (endTime) params.push(`endTime=${endTime}`);

    const stats = await this.http.send(true, 'GET', `${Endpoints.BR_STATS_V2}/account/${userId}${params[0] ? `?${params.join('&')}` : ''}`, `bearer ${this.auth.auths.token}`);
    if (!stats.success) throw new Error(`Fetching ${user}'s stats failed: ${this.parseError(stats.response)}`);

    return stats.response;
  }

  /**
   * Lookups for a creator code
   * @param {string} code The creator code
   * @param {boolean} showSimilar Whether an array with similar creator codes should be returned
   * @returns {Promise<CreatorCode>|Promise<Array<CreatorCode>>}
   */
  async getCreatorCode(code, showSimilar = false) {
    const codeRes = await this.http.send(false, 'GET', `${Endpoints.BR_SAC_SEARCH}?slug=${code}`);
    if (!codeRes.success) throw new Error(`Fetching the creator code ${code} failed: ${this.parseError(codeRes.response)}`);

    const codes = codeRes.response.filter((c) => showSimilar ? true : c.slug === code.toLowerCase());
    const parsedCodes = [];

    for (const ccode of codes) {
      const owner = await this.getProfile(ccode.id);
      parsedCodes.push(new CreatorCode(this, { ...ccode, owner }));
    }

    return showSimilar ? parsedCodes : parsedCodes[0];
  }

  /**
   * Fetches the current Battle Royale store
   * @param {Language} language The language
   * @returns {Promise<BRShop>} The Battle Royale store
   */
  async getBRStore(language = Enums.Language.ENGLISH) {
    const shop = await this.http.send(true, 'GET', `${Endpoints.BR_STORE}?lang=${language}`, `bearer ${this.auth.auths.token}`);
    if (!shop.success) throw new Error(`Fetching shop failed: ${this.parseError(shop.response)}`);

    return new BRShop(shop.response.storefronts);
  }

  /**
   * Fetch the current Battle Royale event flags
   * @param {Language} language The language
   * @returns {Promise<Object>} The Battle Royale event flags
   */
  async getBREventFlags(language = Enums.Language.ENGLISH) {
    const eventFlags = await this.http.send(true, 'GET', `${Endpoints.BR_EVENT_FLAGS}?lang=${language}`, `bearer ${this.auth.auths.token}`);
    if (!eventFlags.success) throw new Error(`Fetching challenges failed: ${this.parseError(eventFlags.response)}`);

    return eventFlags.response;
  }

  /**
   * Fetch the current Fortnite server status
   * @returns {Promise<Object>} The server status
   */
  async getFortniteServerStatus() {
    const fortniteServerStatus = await this.http.send(true, 'GET', Endpoints.BR_SERVER_STATUS, `bearer ${this.auth.auths.token}`);
    if (!fortniteServerStatus.success) throw new Error(`Fetching Fortnite server status failed: ${this.parseError(fortniteServerStatus.response)}`);

    return fortniteServerStatus.response[0];
  }

  /**
   * Fetch the current epicgames server status
   * @returns {Promise<Object>} The server status
   */
  async getServerStatus() {
    const serverStatus = await this.http.send(false, 'GET', Endpoints.SERVER_STATUS_SUMMARY);
    if (!serverStatus.success) throw new Error(`Fetching server status failed: ${this.parseError(serverStatus.response)}`);

    return serverStatus.response;
  }

  /**
   * Fetch all past and upcoming Fortnite tournaments
   * @param {string} region The region eg. EU, ASIA, NAE
   * @param {string} platform The full platform name (Windows, Android, etc)
   * @returns {Promise<Object>} The tournaments
   */
  async getTournaments(region = 'EU', platform = 'Windows') {
    const tournamentsData = await this.http.send(true, 'GET',
      `${Endpoints.BR_TOURNAMENTS}/${this.user.id}?region=${region}&showPastEvents=true`, `bearer ${this.auth.auths.token}`);
    if (!tournamentsData.success) throw new Error(`Fetching tournaments failed: ${this.parseError(tournamentsData.response)}`);

    const tournamentsDownload = await this.http.send(true, 'GET',
      `${Endpoints.BR_TOURNAMENTS_DOWNLOAD}/${this.user.id}?region=${region}&platform=${platform}&teamAccountIds=${this.user.id}`, `bearer ${this.auth.auths.token}`);
    if (!tournamentsDownload.success) throw new Error(`Fetching tournaments failed: ${this.parseError(tournamentsDownload.response)}`);

    tournamentsDownload.response.events.forEach((e) => {
      if (!tournamentsData.response.events.some((de) => de.eventId === e.eventId)) tournamentsData.response.events.push(e);
    });
    tournamentsDownload.response.templates.forEach((e) => {
      if (!tournamentsData.response.templates.some((de) => de.eventTemplateId === e.eventTemplateId)) tournamentsData.response.templates.push(e);
    });

    return tournamentsData.response;
  }

  /**
   * Fetch a Fortnite tournament window by id
   * @param {string} eventId The event id (eg epicgames_S13_FNCS_EU_Qualifier4_PC)
   * @param {string} windowId The window id (eg S13_FNCS_EU_Qualifier4_PC_Round1)
   * @param {boolean} showLiveSessions Whether to show live sessions
   * @param {number} page The starting page
   * @returns {Promise<Object>} The tournament window
   */
  async getTournamentWindow(eventId, windowId, showLiveSessions = false, page = 0) {
    const window = await this.http.send(true, 'GET', `${Endpoints.BR_TOURNAMENT_WINDOW}/${eventId}/${windowId}/`
      + `${this.user.id}?page=${page}&rank=0&teamAccountIds=&appId=Fortnite&showLiveSessions=${showLiveSessions}`,
    `bearer ${this.auth.auths.token}`);
    if (!window.success) throw new Error(`Fetching events failed: ${this.parseError(window.response)}`);

    return window.response;
  }

  /**
   * Fetch all available radio stations
   * @returns {Promise<Object>} Radio stations
   */
  async getRadioStations() {
    const fortniteContent = await this.http.send(false, 'GET', Endpoints.BR_NEWS);
    if (!fortniteContent.success) throw new Error(`Fetching radio stations failed: ${this.parseError(fortniteContent.response)}`);

    const { stations } = fortniteContent.response.radioStations.radioStationList;

    return stations;
  }

  /**
   * Download a radio stream
   * @param {string} id The stream id (use getRadioStations)
   * @param {Language} language The stream language
   * @returns {Promise<Buffer>} The m3u8 audio file as a Buffer
   * @example
   * fs.writeFile('./stream.m3u8', await client.getRadioStream('BXrDueZkosvNvxtx', Enums.Language.ENGLISH));
   * in cmd: ffmpeg -protocol_whitelist https,file,tcp,tls -i stream.m3u8 -ab 211200 radio.mp3
   */
  async getRadioStream(id, language = Enums.Language.ENGLISH) {
    const streamBlurlFile = await this.http.send(false, 'GET', `${Endpoints.BR_STREAM}/${id}/master.blurl`);
    if (!streamBlurlFile.success) throw new Error(`Downloading radio stream failed: ${this.parseError(streamBlurlFile.response.toString())}`);

    const jsonData = await new Promise((res) => zlib.inflate(streamBlurlFile.response.slice(8), (err, decomBuf) => res(JSON.parse(decomBuf))));

    const stream = jsonData.playlists.find((p) => p.type === 'master' && p.language === language);
    if (!stream) throw new Error(`Downloading radio stream failed: Language ${language} is not available for this stream`);

    const variantUrl = stream.data.match(/(?<=URI=")([a-z]|[0-9]|-)+\/variant_.._.._0.m3u8/)[0];
    const baseUrl = `${Endpoints.BR_STREAM}/${id}/${variantUrl.replace(/variant_.._.._0.m3u8/, '')}`;
    const variantStream = jsonData.playlists.find((p) => p.type === 'variant' && p.rel_url === variantUrl);

    return Buffer.from(variantStream.data.split(/\n/).map((l) => (l.startsWith('#') || !l ? l : `${baseUrl}${l}`))
      .join('\n').replace('init_', `${baseUrl}init_`), 'utf-8');
  }

  /**
   * Download a blurl video by its id (eg news videos)
   * @param {string} id The blurl video id (ie videoUID in getNews)
   * @param {Language} language The video language
   * @param {string} resolution The video resolution (1920x1080, 1152x656, 1280x720, 864x480, 640x368, 512x288)
   * @returns {Promise<Buffer>} The m3u8 video file as a buffer
   * @example
   * fs.writeFile('./video.m3u8', await client.getBlurlVideo('kDrsgRdgDiQrNOSu', Enums.Language.ENGLISH, '1920x1080'));
   * in cmd: ffmpeg -protocol_whitelist https,file,tcp,tls -i ./video.m3u8 ./newsVid.mp4
   */
  async getBlurlVideo(id, language = Enums.Language.ENGLISH, resolution = '1920x1080') {
    const blurlFile = await this.http.send(false, 'GET', `${Endpoints.BR_STREAM}/${id}/master.blurl`);
    if (!blurlFile.success) throw new Error(`Downloading blurl video failed: ${this.parseError(blurlFile.response.toString())}`);

    const videoJsonData = await new Promise((res) => zlib.inflate(blurlFile.response.slice(8), (err, decomBuf) => res(JSON.parse(decomBuf))));

    const mainStream = videoJsonData.playlists.find((p) => p.type === 'master' && p.language === language);
    if (!mainStream) throw new Error(`Downloading blurl video failed: Language ${language} not available`);

    const audioStreamUrl = mainStream.data
      .split(/\n/g)
      .find((l) => l.startsWith('#EXT-X-MEDIA:TYPE=AUDIO'))
      .split('URI=').pop()
      .replace(/"/g, '');

    const baseUrl = mainStream.url.replace(/master_.{2,10}\.m3u8/, '');
    const audioStreamParts = audioStreamUrl.split('/');
    audioStreamParts.pop();
    let streamBaseUrl = `${baseUrl}${audioStreamParts.join(' ')}`;
    if (!streamBaseUrl.endsWith('/')) streamBaseUrl += '/';

    const resolutionStreamMatch = mainStream.data.split(/\n/g).find((l) => l.includes(`RESOLUTION=${resolution}`));
    if (!resolutionStreamMatch) throw new Error(`Downloading blurl video failed: Resolution ${resolution} not available!`);
    const resolutionStreamUrl = mainStream.data.split(/\n/g)[mainStream.data.split(/\n/g).findIndex((l) => l === resolutionStreamMatch) + 1];
    const resolutionStream = videoJsonData.playlists.find((p) => p.type === 'variant' && p.rel_url === resolutionStreamUrl);
    if (!resolutionStream) throw new Error(`Downloading blurl video failed: Resolution ${resolution} not available!`);

    return Buffer.from(resolutionStream.data.split(/\n/).map((l) => (l.startsWith('#') || !l ? l : `${streamBaseUrl}${l}`))
      .join('\n').replace('init_', `${streamBaseUrl}init_`)
      .replace('#EXTINF:', `#EXT-X-STREAM-INF:BANDWIDTH=6261200,RESOLUTION=${resolution},CODECS="avc1.640020,mp4a.40.2",AUDIO="group_audio",`
        + 'FRAME-RATE=60.000\n#EXTINF:')
      .replace('#EXT-X-DISCONTINUITY', `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="group_audio",NAME="audio",DEFAULT=YES,URI="${baseUrl}${audioStreamUrl}"\n#EXT-X-DISCONTINUITY`), 'utf-8');
  }

  /**
   * Download a tournament match by its session id
   * @param {string} sessionId The game session id (eg in getTournamentWindow's sessions)
   * @param {?Array} downloads Which replay data to fetch
   * @param {?BufferEncoding} outputEncoding The encoding for binary data
   * @returns {Object} The replay json data
   */
  async getTournamentReplay(sessionId, downloads = ['Checkpoints', 'Events', 'DataChunks'], outputEncoding = 'hex') {
    const tournamentDataLocation = await this.http.send(true, 'GET', `${Endpoints.BR_REPLAY_METADATA}%2F${sessionId}.json`, `bearer ${this.auth.auths.token}`);

    const { response: tournamentReplayData } = await this.http.send(true, 'GET', Object.values(tournamentDataLocation.response.files)[0].readLink);

    const headerLocation = await this.http.send(false, 'GET', `${Endpoints.BR_REPLAY}%2F${sessionId}%2Fheader.bin`, `bearer ${this.auth.auths.token}`);
    const header = await this.http.send(false, 'GET', Object.values(headerLocation.response.files)[0].readLink, `bearer ${this.auth.auths.token}`);
    tournamentReplayData.Header = { data: Buffer.from(header.response).toString(outputEncoding) };

    const promises = [];
    for (const downloadKey of downloads) {
      const chunks = tournamentReplayData[downloadKey];
      for (const chunk of chunks) {
        const download = async () => {
          const location = await this.http.send(false, 'GET', `${Endpoints.BR_REPLAY}%2F${sessionId}%2F${chunk.Id}.bin`, `bearer ${this.auth.auths.token}`);
          const binaryFile = await this.http.send(true, 'GET', Object.values(location.response.files)[0].readLink);
          if (chunk.Group === 'Highlight') tournamentReplayData.Highlight = binaryFile.response;
          else tournamentReplayData[downloadKey].find((c) => c.Id === chunk.Id).data = Buffer.from(binaryFile.response).toString(outputEncoding);
        };
        promises.push(download());
      }
    }

    await Promise.all(promises);

    return tournamentReplayData;
  }
}

module.exports = Client;

/**
 * Emitted when the Client is ready
 * @event Client#ready
 */

/**
 * Emitted when a device auth is created for the client's user
 * @event Client#deviceauth:created
 * @param {DeviceAuthCredentials} credentials The device auth's credentials
 */

/**
 * Emitted when a member sends a message in the party's chat room
 * @event Client#party:member:message
 * @param {PartyMessage} partyMessage The party message
 */

/**
 * Emitted when a friend updates his presence
 * @event Client#friend:presence
 * @param {FriendPresence} beforeFriendPresence The previous friend's presence
 * @param {FriendPresence} beforeFriendPresence The current friend's presence
 */

/**
 * Emitted when the client receives a message from a friend
 * @event Client#friend:message
 * @param {FriendMessage} friendMessage The friend message
 */

/**
 * Emitted when a friend request is accepted
 * @event Client#friend:added
 * @param {Friend} friend The added friend
 */

/**
 * Emitted when the client receives a friend request
 * @event Client#friend:request
 * @param {PendingFriend} pendingFriend The received friend request
 */

/**
 * Emitted when the client sends a friend request
 * @event Client#friend:request:sent
 * @param {PendingFriend} pendingFriend The sent friend request
 */

/**
 * Emitted when a friend request is aborted
 * @event Client#friend:request:aborted
 * @param {PendingFriend} pendingFriend The aborted friend request
 */

/**
 * Emitted when a friend request is rejected
 * @event Client#friend:request:rejected
 * @param {PendingFriend} pendingFriend The rejected friend request
 */

/**
 * Emitted when a friend is removed
 * @event Client#friend:removed
 * @param {Friend} friend The removed friend
 */

/**
 * Emitted when a friend is blocked
 * @event Client#friend:blocked
 * @param {Friend} friend The blocked friend
 */

/**
 * Emitted when a friend is unblocked
 * @event Client#friend:unblocked
 * @param {Friend} friend The unblocked friend
 */

/**
 * Emitted when the client receives a party invite
 * @event Client#party:invite
 * @param {PartyInvitation} partyInvitation The party invite
 */

/**
 * Emitted when a member joins the party
 * @event Client#party:member:joined
 * @param {PartyMember} partyMember The member that joined the party
 */

/**
 * Emitted when a party member gets updated
 * @event Client#party:member:updated
 * @param {PartyMember} partyMember The updated party member
 */

/**
 * Emitted when a member leaves the party
 * @event Client#party:member:left
 * @param {PartyMember} partyMember The party member
 */

/**
 * Emitted when a party member expires
 * @event Client#party:member:expired
 * @param {PartyMember} partyMember The party member
 */

/**
 * Emitted when a party member gets kicked
 * @event Client#party:member:kicked
 * @param {PartyMember} partyMember The kicked party member
 */

/**
 * Emitted when a party member gets disconnected
 * @event Client#party:member:disconnected
 * @param {PartyMember} partyMember The disconnected party member
 */

/**
 *  Emitted when a party member gets promoted
 * @event Client#party:member:promoted
 * @param {PartyMember} partyMember The promoted party member
 */

/**
 * Emitted when a party member gets updated
 * @event Client#party:updated
 * @param {PartyMember} partyMember The updated party member
 */

/**
 * Emitted when a party invite gets declined
 * @event Client#party:invite:declined
 * @param {Friend} friend The friend that declined the party invite
 */

/**
 * Emitted when a device code should be prompted to the user
 * @event Client#devicecode:prompt
 * @param {string} code The device code url
 */
