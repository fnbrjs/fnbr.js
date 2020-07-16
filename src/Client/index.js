/* eslint-disable no-await-in-loop */
/* eslint-disable no-confusing-arrow */
/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable no-console */
const EventEmitter = require('events');
const { createInterface } = require('readline');
const onExit = require('async-exit-hook');
const Authenticator = require('./auth.js');
const Xmpp = require('../XMPP');
const Http = require('../Util/http');
const Endpoints = require('../../resources/Endpoints.js');
const ClientUser = require('../Structures/ClientUser.js');
const Friend = require('../Structures/Friend.js');
const User = require('../Structures/User');
const CreatorCode = require('../Structures/CreatorCode');
const Enums = require('../../enums');
const List = require('../Util/List');
const FriendMessage = require('../Structures/FriendMessage.js');
const Party = require('../Structures/Party.js');

/**
 * The main client
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {
  /**
   * @param {Object} args client options like `auth`options or `debug`options. Can be modified in client.config
   */
  constructor(args = {}) {
    super();
    this.config = {
      savePartyMemberMeta: true,
      http: {},
      debug: console.log,
      httpDebug: false,
      xmppDebug: false,
      status: '',
      platform: Enums.Platform.WINDOWS,
      memberMeta: undefined,
      ...args,
      auth: {
        deviceAuth: undefined,
        exchangeCode: undefined,
        authorizationCode: undefined,
        refreshToken: undefined,
        checkEULA: true,
        ...args.auth,
      },
      partyConfig: {
        privacy: Enums.PartyPrivacy.PUBLIC,
        joinConfirmation: false,
        joinability: 'OPEN',
        maxSize: 16,
        chatEnabled: true,
        ...args.partyConfig,
      },
    };

    /**
     * If client is ready
     */
    this.isReady = false;

    /**
     * Used to store outfit, etc of the client even if he switches parties
     */
    this.lastMemberMeta = this.config.memberMeta;

    /**
     * Client user account
     * @type {ClientUser}
     */
    this.account = undefined;

    /**
     * The paryt the client is in
     * @type {Party}
     */
    this.party = undefined;

    /**
     * Client authenticator
     */
    this.Auth = new Authenticator(this);
    /**
     * Client http util
     */
    this.Http = new Http(this);
    /**
     * Client xmpp communicator
     */
    this.Xmpp = new Xmpp(this);
    /**
     * Clients cached friends (updated with xmpp events)
     */
    this.friends = new List();
    /**
     * Clients cached pending friends (updated with xmpp events)
     */
    this.pendingFriends = new List();
    /**
     * Clients cached blocked friends (updated with xmpp events)
     */
    this.blockedFriends = new List();

    /**
     * Parse an error that could be an object or a string
     * @private
     * @param {Object|String} err error to parse
     */
    this.parseError = (err) => typeof err === 'object' ? JSON.stringify(err) : err;

    /**
     * Convert an objects keys to camel case
     * @param {Object} obj object to convert
     */
    this.makeCamelCase = Client.makeCamelCase;

    onExit(async (callback) => {
      await this.logout();
      callback();
    });
  }

  static get Party() {
    return Party;
  }

  // -------------------------------------GENERAL-------------------------------------

  /**
   * Connect the client to epicgames servers. Make sure to provide a valid login method first!
   */
  async login() {
    const auth = await this.Auth.authenticate();
    if (!auth.success) throw new Error(`Authentification failed: ${this.parseError(auth.response)}`);

    this.tokenCheckInterval = setInterval(() => this.Auth.refreshToken(true), 20 * 60000);

    const clientInfo = await this.Http.send(false, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${this.Auth.account.id}`, `bearer ${this.Auth.auths.token}`);
    if (!clientInfo.success) throw new Error(`Clientaccount lookup failed: ${this.parseError(clientInfo.response)}`);
    this.account = new ClientUser(this, clientInfo.response[0]);

    this.Xmpp.setup();

    await this.updateCache();

    const xmpp = await this.Xmpp.connect();
    if (!xmpp.success) throw new Error(`XMPP-client connecting failed: ${this.parseError(xmpp.response)}`);

    await this.refreshParty();
    if (this.party) this.party.leave(false);
    await Party.Create(this);

    this.emit('ready');
    this.isReady = true;
  }

  /**
   * Disconnect the client. Kills all tokens, disconnects the xmpp client and leaves the clients party
   */
  async logout() {
    if (this.tokenCheckInterval) clearInterval(this.tokenCheckInterval);
    this.removeAllListeners();
    if (this.Xmpp.connected) await this.Xmpp.disconnect();
    if (this.Auth.auths.token) await this.Http.send(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL}/${this.Auth.auths.token}`, `bearer ${this.Auth.auths.token}`);

    this.Auth.auths.token = undefined;
    this.Auth.auths.expires_at = undefined;
    this.Auth.reauths.token = undefined;
    this.Auth.reauths.expires_at = undefined;

    this.isReady = false;
  }

  /**
   * Restarts the entire client
   */
  async restart() {
    if (this.tokenCheckInterval) clearInterval(this.tokenCheckInterval);
    if (this.Xmpp.connected) await this.Xmpp.disconnect();
    await this.Http.send(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL}/${this.Auth.auths.token}`, `bearer ${this.Auth.auths.token}`);

    return this.login();
  }

  /**
   * Refreshes client.friends, client.blockedFriends and client.pendingFriends
   * Normally theres `no need to use this function` as the client refreshes the cache with xmpp events
   */
  async updateCache() {
    const [rawFriends, friendsSummary] = await Promise.all([
      this.Http.send(true, 'GET', `${Endpoints.FRIENDS}/public/friends/${this.account.id}?includePending=true`, `bearer ${this.Auth.auths.token}`),
      this.Http.send(true, 'GET', `${Endpoints.FRIENDS}/v1/${this.account.id}/summary?displayNames=true`, `bearer ${this.Auth.auths.token}`),
    ]);

    for (const rawFriend of rawFriends.response) {
      if (rawFriend.status === 'ACCEPTED') this.friends.set(rawFriend.accountId, rawFriend);
      else if (rawFriend.status === 'PENDING') this.pendingFriends.set(rawFriend.accountId, rawFriend);
      else if (rawFriend.status === 'BLOCKED') this.blockedFriends.set(rawFriend.accountId, rawFriend);
      else this.debug(rawFriend.status);
    }

    this.friends.clear();
    for (const friendedFriend of friendsSummary.response.friends) {
      const friend = this.friends.get(friendedFriend.accountId);
      this.friends.set(friendedFriend.accountId, new Friend(this, { ...friend, ...friendedFriend }));
    }

    this.blockedFriends.clear();
    for (const blockedFriend of friendsSummary.response.blocklist) {
      const friend = this.blockedFriends.get(blockedFriend.accountId);
      this.friends.set(blockedFriend.accountId, new Friend(this, { ...friend, ...blockedFriend }));
    }

    this.pendingFriends.clear();
    for (const incomingFriend of friendsSummary.response.incoming) {
      const friend = this.pendingFriends.get(incomingFriend.accountId);
      this.friends.set(incomingFriend.accountId, new Friend(this, { ...friend, ...incomingFriend }));
    }
    for (const outgoingFriend of friendsSummary.response.incoming) {
      const friend = this.pendingFriends.get(outgoingFriend.accountId);
      this.friends.set(outgoingFriend.accountId, new Friend(this, { ...friend, ...outgoingFriend }));
    }
  }

  async refreshParty() {
    this.party = await Party.LookupSelf(this);
  }

  /**
   * Auth data if you want to do requests to epic yourself. In most cases you wont need this
   */
  get authData() {
    return {
      accessToken: this.Auth.auths.token,
      refreshToken: this.Auth.reauths.token,
    };
  }

  // -------------------------------------UTIL-------------------------------------

  /**
   * Debug a message via client.config.debug if available
   * @param {String} message message to debug
   */
  debug(message) {
    if (this.config.debug) this.config.debug(message);
  }

  /**
   * Convert an objects keys to camel case
   * @param {Object} obj object to convert
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
   * Wait for a client event
   * @param {String|Symbol} event event to wait for
   * @param {Number|5000} timeout timeout in ms to throw an error
   * @param {Function?} filter function to apply on the returned event
   */
  waitForEvent(event, timeout = 5000, filter = undefined) {
    return new Promise((res, rej) => {
      this.once(event, (eventData) => {
        if (!filter || filter(eventData)) res(eventData);
      });
      setTimeout(() => rej(new Error('Event timeout exceed')), timeout);
    });
  }

  static sleep(timeout) {
    return new Promise((res) => setTimeout(() => res(), timeout));
  }

  /**
   * Display a console prompt that resolves in a promise awaiting for an answer
   * @param {String} question text to prompt
   * @returns {Promise<String>} answer
   */
  static consoleQuestion(question) {
    const itf = createInterface(process.stdin, process.stdout);
    return new Promise((res) => itf.question(question, (answer) => { itf.close(); res(answer); }));
  }

  /**
   * Wait for the client to get ready
   * @param {Number} timeout time in ms to wait before rejecting the promise
   */
  waitUntilReady(timeout = 20000) {
    return new Promise((res, rej) => {
      if (this.isReady) res();
      setInterval(() => {
        if (this.isReady) res();
      }, 250);
      setTimeout(() => rej(new Error('Waiting for ready timeout exceed')), timeout);
    });
  }

  // -------------------------------------ACCOUNT-------------------------------------

  /**
   * Fetch an epicgames profile
   * @param {String|Array<String>} query id, name or email of the profile to lookup (can be a string or array)
   * @returns {Promise<User>|Promise<Array<User>>|undefined} the looked up users (undefined if a lookup fails)
   */
  async getProfile(query) {
    let user;
    if (typeof query === 'string') {
      if (query.length === 32) user = await this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_ID}/${query}`, `bearer ${this.Auth.auths.token}`);
      else if (/.*@.*\..*/.test(query)) user = await this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_EMAIL}/${encodeURI(query)}`, `bearer ${this.Auth.auths.token}`);
      else user = await this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURI(query)}`, `bearer ${this.Auth.auths.token}`);

      return user.success ? new User(this, user.response) : undefined;
    } if (typeof query === 'object') {
      const ids = [];
      const names = [];
      const emails = [];

      for (const userQuery of query) {
        if (userQuery.length === 32) ids.push(userQuery);
        else if (/.*@.*\..*/.test(userQuery)) emails.push(userQuery);
        else names.push(userQuery);
      }

      const nameResults = (await Promise.all(names.map((name) => this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_DISPLAYNAME}/${encodeURI(name)}`, `bearer ${this.Auth.auths.token}`))))
        .filter((name) => name.success).map((name) => new User(this, name.response));
      const emailResults = (await Promise.all(emails.map((email) => this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_EMAIL}/${encodeURI(email)}`, `bearer ${this.Auth.auths.token}`))))
        .filter((email) => email.success).map((email) => new User(this, email.response));
      let idResults = await this.Http.send(true, 'GET', `${Endpoints.ACCOUNT_MULTIPLE}?accountId=${ids.join('&accountId=')}`, `bearer ${this.Auth.auths.token}`);
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
   * Change the friendlist status of the client
   * @param {String} status Status to display, empty to reset it
   * @param {String?} to user to send the status to | empty for entire friendlist
   * @returns {Promise<void>} nothing
   */
  setStatus(status, to) {
    let id;
    if (to) {
      const cachedFriend = this.friends.find((f) => f.id === to || f.displayName === to);
      if (!cachedFriend) throw new Error(`Failed sending a status to ${to}: Friend not existing`);
      id = this.Xmpp.sendStatus(status, `${cachedFriend.id}@${Endpoints.EPIC_PROD_ENV}`);
    } else {
      this.config.status = status;
      id = this.Xmpp.sendStatus(status);
    }

    return new Promise((res, rej) => {
      this.Xmpp.stream.on(`presence#${id}:sent`, () => res());
      setTimeout(() => rej(new Error('Failed sending a status: Status timeout of 20000ms exceeded')), 20000);
    });
  }

  // -------------------------------------FRIENDS-------------------------------------

  /**
   * Add a user as a friend or accept a friend request
   * @param {String} user id, name or email of the user to friend / accept
   */
  async addFriend(user) {
    let userId;
    if (user.length === 32) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Adding ${user} as a friend failed: Account not found`);
      userId = lookedUpUser.id;
    }
    const userRequest = await this.Http.send(true, 'POST', `${Endpoints.FRIEND_ADD}/${this.account.id}/${userId}`, `bearer ${this.Auth.auths.token}`);
    if (!userRequest.success) throw new Error(`Adding ${user} as a friend failed: ${this.parseError(userRequest.response)}`);
  }

  /**
   * Remove a friend or decline a friend request
   * @param {String} user id, name or email of the user to unfriend / decline
   */
  async removeFriend(user) {
    let userId;
    if (user.length === 32) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Removing ${user} as a friend failed: Account not found`);
      userId = lookedUpUser.id;
    }
    const userRequest = await this.Http.send(true, 'DELETE', `${Endpoints.FRIEND_DELETE}/${this.account.id}/friends/${userId}`, `bearer ${this.Auth.auths.token}`);
    if (!userRequest.success) throw new Error(`Removing ${user} as a friend failed: ${this.parseError(userRequest.response)}`);
  }

  /**
   * Block a friend
   * @param {String} friend id, name or email of the friend to block
   */
  async blockFriend(friend) {
    const cachedFriend = this.friends.find((f) => f.id === friend || f.displayName === friend);
    if (!cachedFriend) throw new Error(`Blocking ${friend} failed: Friend not existing`);

    const blockListUpdate = await this.Http.send(true, 'POST', `${Endpoints.FRIEND_BLOCK}/${this.account.id}/${cachedFriend.id}`, `bearer ${this.Auth.auths.token}`);
    if (!blockListUpdate.success) throw new Error(`Blocking ${friend} failed: ${this.parseError(blockListUpdate.response)}`);
  }

  /**
   * Block a friend
   * @param {String} friend id, name or email of the friend to block
   */
  async unblockFriend(friend) {
    const cachedBlockedFriend = this.blockedFriends.find((f) => f.id === friend || f.displayName === friend);
    if (!cachedBlockedFriend) throw new Error(`Unblocking ${friend} failed: User not in the blocklist`);

    const blockListUpdate = await this.Http.send(true, 'DELETE', `${Endpoints.FRIEND_BLOCK}/${this.account.id}/${cachedBlockedFriend.id}`, `bearer ${this.Auth.auths.token}`);
    if (!blockListUpdate.success) throw new Error(`Unblocking ${friend} failed: ${this.parseError(blockListUpdate.response)}`);
  }

  /**
   * Send a message to a friend
   * @param {String} friend id or name of the friend to message
   * @param {String} message message to send
   * @returns {Promise<FriendMessage>} the message
   */
  sendFriendMessage(friend, message) {
    if (!message) throw new Error(`Failed sending a friend message to ${friend}: Cannot send an empty message`);
    const cachedFriend = this.friends.find((f) => f.id === friend || f.displayName === friend);
    if (!cachedFriend) throw new Error(`Failed sending a friend message to ${friend}: Friend not existing`);
    const id = this.Xmpp.stream.sendMessage({
      to: `${cachedFriend.id}@${Endpoints.EPIC_PROD_ENV}`,
      type: 'chat',
      body: message,
    });

    return new Promise((res, rej) => {
      this.Xmpp.stream.on(`message#${id}:sent`, () => res(new FriendMessage(this, { body: message, author: this.account })));
      setTimeout(() => rej(new Error(`Failed sending a friend message to ${friend.id}: Message timeout of 20000ms exceeded`)), 20000);
    });
  }

  // -------------------------------------BATTLE ROYALE-------------------------------------

  /**
   * Fetch news for a gamemode
   * @param {Enums.Gamemode} mode gamemode to fetch the news for
   * @param {Enums.Language} language language to fetch the news in
   * @returns {Promise<Array>} news motds
   */
  async getNews(mode = Enums.Gamemode.BATTLE_ROYALE, language = Enums.Language.ENGLISH) {
    const news = await this.Http.send(false, 'GET', `${Endpoints.BR_NEWS}?lang=${language}`);
    if (!news.success) throw new Error(`Fetching news failed: ${this.parseError(news.response)}`);

    if (mode === Enums.Gamemode.BATTLE_ROYALE) return news.response[`${mode}news`].news.motds;
    return news.response[`${mode}news`].news;
  }

  /**
   * Fetch v2 stats for a player
   * @param {Number?} startTime epoch to start fetching stats (empty for lifetime)
   * @param {Number?} endTime epoch to stop fetching stats (empty for lifetime)
   * @returns {Promise<Object>} player stats
   */
  async getBrStats(user, startTime, endTime) {
    let userId;
    if (user.length === 32) userId = user;
    else {
      const lookedUpUser = await this.getProfile(user);
      if (!lookedUpUser) throw new Error(`Fetching ${user}'s stats failed: Account not found`);
      userId = lookedUpUser.id;
    }

    const params = [];
    if (startTime) params.push(`startTime=${startTime}`);
    if (endTime) params.push(`startTime=${endTime}`);

    const stats = await this.Http.send(true, 'GET', `${Endpoints.BR_STATS_V2}/${userId}${params[0] ? `?${params.join('&')}` : ''}`);
    if (!stats.success) throw new Error(`Fetching ${user}'s stats failed: ${this.parseError(stats.response)}`);

    return stats.response;
  }

  /**
   * Lookup a creator code
   * @param {String} code the code
   * @param {Boolean} showSimilar if an array with similar codes should be returned
   * @returns {Promise<CreatorCode>|Promise<Array<CreatorCode>>|Promise<undefined>} the code or an array of similar ones
   */
  async getCreatorCode(code, showSimilar = false) {
    const codeRes = await this.Http.send(false, 'GET', `${Endpoints.BR_SAC_SEARCH}?slug=${code}`);
    if (!codeRes.success) throw new Error(`Fetching  the creator code ${code} failed: ${this.parseError(codeRes.response)}`);

    const codes = codeRes.response.filter((c) => showSimilar ? c : c.slug === code);
    const parsedCodes = [];

    for (const ccode of codes) {
      const owner = await this.getProfile(ccode.id);
      parsedCodes.push(new CreatorCode(this, { ...ccode, owner }));
    }

    return showSimilar ? parsedCodes : parsedCodes[0];
  }

  /**
   * Fetch the current battle royale store
   * @param {Enums.Language} language language to fetch the news in
   * @returns {Promise<Array>} news motds
   */
  async getBrStore(language = Enums.Language.ENGLISH) {
    const shop = await this.Http.send(true, 'GET', `${Endpoints.BR_STORE}?lang=${language}`, `bearer ${this.Auth.auths.token}`);
    if (!shop.success) throw new Error(`Fetching shop failed: ${this.parseError(shop.response)}`);

    return shop.response;
  }
}

module.exports = Client;
