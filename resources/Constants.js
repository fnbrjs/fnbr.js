/* eslint-disable no-console */
/* eslint-disable max-len */
const Enums = require('../enums');

/**
 * The options for a client
 * @typedef {Object} ClientOptions
 * @property {boolean} [savePartyMemberMeta=true] Whether to save the party member meta
 * @property {HttpOptions} [http] The options to be used for the client's HTTP manager
 * @property {function} [debug=console.log] Used to send debug messages
 * @property {boolean} [httpDebug=false] Whether to send HTTP debug messages
 * @property {boolean} [xmppDebug=false] Whether to send XMPP debug messages
 * @property {string} [status=''] The presence status message of the client's user
 * @property {Platform} [platform=WINDOWS] The platform that will be used for the client's user
 * @property {Object} [memberMeta={}] The client's default member meta for joined parties
 * @property {number} [keepAliveInterval=60] The client's XMPP connection's keep alive interval
 * @property {boolean} [cachePresences=true] Whether friend presences should be cached. NOTE: This will break friend.isOnline, friend.isJoinable and friend.joinParty()
 * @property {ClientAuth} auth The credentials that will be used for client's authentication
 * @property {PartyConfig} partyConfig The default party config
 * @property {KairosConfig} kairos The default kairos config
 */
module.exports.ClientOptions = Object.freeze({
  savePartyMemberMeta: true,
  /**
   * The options to be used for the client's HTTP manager
   * @typedef {Object} HttpOptions
   * @property {number} [timeout=10000] The timeout (in milliseconds) of the HTTP requests
   * @property {Object} [header={}] The default headers that will be used for each HTTP request
   * @property {boolean} [json=true] Whether to return an HTTP request's response as an JSON object
   */
  http: {
    timeout: 10000,
    headers: {},
    json: true,
  },
  debug: console.log,
  httpDebug: false,
  xmppDebug: false,
  status: '',
  platform: Enums.Platform.WINDOWS,
  memberMeta: {},
  keepAliveInterval: 60,
  cachePresences: true,
  /**
   * The credentials that will be used for client's authentication
   * @typedef {Object} ClientAuth
   * @property {Object|string|function} [deviceAuth] The device auth's credentials
   * @property {string} [exchangeCode] The exchange code
   * @property {string} [authorizationCode] The authorization code
   * @property {string} [refreshToken] The refresh token
   * @property {boolean} [checkEULA=true] Whether EULA should be checked and agreed or not
   */
  auth: {
    deviceAuth: undefined,
    exchangeCode: undefined,
    authorizationCode: undefined,
    refreshToken: undefined,
    checkEULA: true,
  },
  /**
   * The party config
   * @typedef {Object} PartyConfig
   * @property {PartyPrivacy} [privacy=PUBLIC] The privacy of the party
   * @property {boolean} [joinConfirmation=false] Whether joining party needs confirmation
   * @property {string} [joinability='OPEN'] The joinability of the party
   * @property {number} [maxSize=16] The maximum member size of the party
   * @property {boolean} [chatEnabled=true] Whether the chat of the party should be enabled
   */
  partyConfig: {
    privacy: Enums.PartyPrivacy.PUBLIC,
    joinConfirmation: false,
    joinability: 'OPEN',
    maxSize: 16,
    chatEnabled: true,
  },
  /**
   * The Kairos config
   * @typedef {Object} KairosConfig
   * @property {string} [cid=DefaultSkin#random] The CID of the Kairos avatar
   * @property {string} [color=DefaultColor#random] The color of the Kairos avatar
   */
  kairos: {
    cid: Object.values(Enums.DefaultSkin)[Math.floor(Math.random() * Object.values(Enums.DefaultSkin).length)],
    color: Object.values(Enums.KairosColor)[Math.floor(Math.random() * Object.values(Enums.KairosColor).length)],
  },
});

/**
 * Contains authorization data for Epic Games' services
 * @typedef {Object} AuthData
 * @property {?string} token The access token
 * @property {?string} expires_at The access token's expiration date as ISO string
 * @private
 */
module.exports.AuthData = Object.freeze({
  token: undefined,
  expires_at: undefined,
});

/**
 * Contains data of the authorized Epic Games account
 * @typedef {Object} AuthAccount
 * @property {?string} id The id of the account
 * @property {?string} displayName The display name of the account
 * @private
 */
module.exports.AuthAccount = Object.freeze({
  id: undefined,
  displayName: undefined,
});

/**
 * Contains data about a friend presence's Kairos avatar
 * @typedef {Object} FPKairosAvatar
 * @property {?string} asset The avatar's asset
 * @property {?string} background The avatar's background
 */
module.exports.FPKairosAvatar = Object.freeze({
  asset: undefined,
  background: undefined,
});

/**
 * Contains data about a friend's gameplay stats
 * @typedef {Object} FPGameplayStats
 * @property {?number} kills The kill count of the friends in the gameplay
 * @property {?boolean} fellToDeath Whether the friend died
 * @property {?number} serverPlayerCount The player count on the gameplay's server
 */
module.exports.FPGameplayStats = Object.freeze({
  kills: undefined,
  fellToDeath: false,
  serverPlayerCount: undefined,
});

/**
 * Contains data about a friend's party
 * @typedef {Object} FPPartyData
 * @property {?string} id The id of the party
 * @property {?boolean} isPrivate Whether the party is private or not
 * @property {?number} memberCount The party's member count
 * @property {?string} platform The party's platform
 * @property {?string} buildId The party's build id
 */
module.exports.FPPartyData = Object.freeze({
  id: undefined,
  isPrivate: undefined,
  memberCount: undefined,
  platform: undefined,
  buildId: undefined,
});

/**
 * Contains a device auth's credentials
 * @typedef {Object} DeviceAuthCredentials
 * @property {string} accountId The account id of the device auth
 * @property {string} deviceId The id of the device auth
 * @property {string} secret The secret of the device auth
 */
module.exports.DeviceAuthCredentials = Object.freeze({
  accountId: undefined,
  deviceId: undefined,
  secret: undefined,
});
