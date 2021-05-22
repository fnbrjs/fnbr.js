
/// <reference types="node" />

import * as events from 'events';
import * as Client from './src/client';
import * as Party from './src/structs/Party';
import * as Enum from './enums/index';
import * as PartyMessage from './src/structs/PartyMessage';
import * as FriendPresence from './src/structs/FriendPresence';
import * as FriendMessage from './src/structs/FriendMessage';
import * as Friend from './src/structs/Friend';
import * as PendingFriend from './src/structs/PendingFriend';
import * as PartyInvitation from './src/structs/PartyInvitation';
import * as PartyMember from './src/structs/PartyMember';
import { DeviceAuthCredentials } from './resources/Constants';
import FriendManager from './src/client/managers/FriendManager';
import * as ClientUser from './src/structs/ClientUser.js';
import Authenticator from './src/client/Authenticator';


declare class Client extends events.EventEmitter {

    on(event: 'ready', listener: () => void): this;
    on(event: 'deviceauth:created', listener: (credentials: DeviceAuthCredentials) => void): this;
    on(event: 'party:member:message', listener: (partyMessage: PartyMessage) => void): this;
    on(event: 'friend:presence', listener: (beforeFriendPresence: FriendPresence, CurrentFriendPresence: FriendPresence) => void): this;
    on(event: 'friend:message', listener: (friendMessage: FriendMessage) => void): this;
    on(event: 'friend:added', listener: (friend: Friend) => void): this;
    on(event: 'friend:request', listener: (pendingFriend: PendingFriend) => void): this;
    on(event: 'friend:request:sent', listener: (pendingFriend: PendingFriend) => void): this;
    on(event: 'friend:request:aborted', listener: (pendingFriend: PendingFriend) => void): this;
    on(event: 'friend:request:rejected', listener: (pendingFriend: PendingFriend) => void): this;
    on(event: 'friend:removed', listener: (friend: Friend) => void): this;
    on(event: 'friend:blocked', listener: (friend: Friend) => void): this;
    on(event: 'friend:unblocked', listener: (friend: Friend) => void): this;
    on(event: 'party:invite', listener: (partyInvitation: PartyInvitation) => void): this;
    on(event: 'party:member:joined', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:updated', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:left', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:expired', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:kicked', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:disconnected', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:member:promoted', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:updated', listener: (partyMember: PartyMember) => void): this;
    on(event: 'party:invite:declined', listener: (friend: Friend) => void): this;
    on(event: 'devicecode:prompt', listener: (code: string) => void): this;


    /**
     * @param {ClientOptions} args Client options
     */
    constructor(args)


    /**
     * The config of the client
     * @type {ClientOptions}
     */
    config;

    /**
     * Whether the client is ready or not
     * @type {boolean}
     */
    isReady;

    /**
     * The default party member meta of the client
     * @type {?Object}
     * @private
     */
    lastMemberMeta;

    /**
     * The user of the client
     * @type {ClientUser}
     */
    user;

    /**
     * The party that the client is currently in
     * @type {Party}
     * @returns {Party}
     */
    party;

    /**
     * The authentication manager of the client
     * @type {Authenticator}
     * @private
     */
    auth;

    /**
     * The HTTP manager of the client
     * @type {HTTP}
     * @private
     */
    http;
    /**
     * The XMPP manager of the client
     * @type {XMPP}
     * @private
     */
    xmpp;
    /**
     * The friend manager of the client
     * @type {FriendManager}
     */
    friends;



    // -------------------------------------GENERAL-------------------------------------



    /**
     * Initiates client's login process
     * @returns {Promise<void>}
     */
    login()

    /**
     * Disconnects the client
     * @returns {Promise<void>}
     */
    logout()

    /**
     * Restarts the client
     * @returns {Promise<void>}
     */
    restart()

    /**
     * Refreshes the client's friends (including pending and blocked)
     * @returns {Promise<void>}
     * @private
     */
    updateCache()

    /**
     * Initiates a party
     * @param {boolean} create Whether to create a new party if the bot is already member of a party
     * @returns {Promise<void>}
     * @private
     */
    initParty(create)

    // -------------------------------------UTIL-------------------------------------

    /**
     * Debug a message via the debug function provided in the client's config (if provided)
     * @param {string} message The message that will be debugged
     * @returns {void}
     * @private
     */
    debug(message)

    /**
     * Convert an object's keys to camel case
     * @param {Object} obj The object that will be converted
     * @returns {Object} The converted object
     * @private
     */
    static makeCamelCase(obj)

    /**
     * Sleep until an event is emitted
     * @param {string|symbol} event The event will be waited for
     * @param {number} [timeout=5000] The timeout (in milliseconds)
     * @param {function} [filter] The filter for the event
     * @returns {Promise<Object>}
     */
    waitForEvent(event, timeout, filter)

    /**
     * Sleep for the provided milliseconds
     * @param {number} timeout The timeout (in milliseconds)
     * @returns {Promise<void>}
     * @private
     */
    static sleep(timeout)

    /**
     * Display a console prompt
     * @param {string} question The text that will be prompted
     * @returns {Promise<string>} The received answer
     * @private
     */
    static consoleQuestion(question)

    /**
     * Sleep until the client is ready
     * @param {number} [timeout=20000] The timeout (in milliseconds)
     */
    waitUntilReady(timeout)

    /**
     * Merges a default object with a given one
     * @param {Object} def The default object
     * @param {Object} given The given object
     * @returns {Object} The merged objects
     * @private
     */
    static mergeDefault(def, given)

    /**
     * Merges a default object with a given one
     * @param {Object} def The default object
     * @param {Object} given The given object
     * @returns {Object} The merged objects
     * @private
     */
    mergeDefault(def, given)

    // -------------------------------------ACCOUNT-------------------------------------

    /**
     * Fetches an Epic Games account
     * @param {string|Array<string>} query The id, name or email of the account(s) you want to fetch
     * @returns {Promise<User>|Promise<Array<User>>} The fetched account(s)
     * @example
     * client.getProfile('aabbccddeeff00112233445566778899');
     */
    getProfile(query)

    /**
     * Changes the presence status
     * @param {string} [status] The status message; can be null/undefined if you want to reset it
     * @param {string} [to] The display name or the id of the friend; can be undefined if you want to update the presence status for all friends
     * @returns {Promise<void>}
     */
    setStatus(status, to)

    // -------------------------------------FRIENDS-------------------------------------

    /**
     * Sends / accepts a friend request to an Epic Games user
     * @param {string} user The id, name or email of the user
     * @returns {Promise<void>}
     */
    addFriend(user)

    /**
     * Removes a friend or reject an user's friend request
     * @param {string} user The id, name or email of the user
     * @returns {Promise<void>}
     */
    removeFriend(user)

    /**
     * Blocks a user
     * @param {string} user The id, name or email of the user
     * @returns {Promise<void>}
     */
    blockUser(user)

    /**
     * Unblocks a user
     * @param {string} user The id, name or email of the user
     * @returns {Promise<void>}
     */
    unblockUser(user)

    /**
     * Sends a message to a friend
     * @param {string} friend The id or name of the friend
     * @param {string} message The message
     * @returns {Promise<FriendMessage>} The sent friend message
     */
    sendFriendMessage(friend, message)

    /**
     * Sends a party invitation to a friend
     * @param {string} friend The id or name of the friend
     * @returns {Promise<SentPartyInvitation>}
     */
    invite(friend)

    // -------------------------------------BATTLE ROYALE-------------------------------------

    /**
     * Fetches news for a gamemode
     * @param {Gamemode} mode The gamemode
     * @param {Language} language The language
     * @returns {Promise<Array<News>>}
     */
    getNews(mode, language)

    /**
     * Fetches v2 stats for one or multiple players
     * @param {string} user The id, name or email of the user
     * @param {number} [startTime] The timestamp to start fetching stats from; can be null/undefined for lifetime
     * @param {number} [endTime] The timestamp to stop fetching stats from; can be undefined for lifetime
     * @returns {Promise<Object>}
     */
    getBRStats(user, startTime, endTime)

    /**
     * Lookups for a creator code
     * @param {string} code The creator code
     * @returns {Promise<CreatorCode>}
     */
    getCreatorCode(code)

    /**
     * Fetches the current Battle Royale store
     * @param {Language} language The language
     * @returns {Promise<BRShop>} The Battle Royale store
     */
    getBRStore(language)

    /**
     * Fetch the current Battle Royale event flags
     * @param {Language} language The language
     * @returns {Promise<Object>} The Battle Royale event flags
     */
    getBREventFlags(language)

    /**
     * Fetch the current Fortnite server status
     * @returns {Promise<Object>} The server status
     */
    getFortniteServerStatus()

    /**
     * Fetch the current epicgames server status
     * @returns {Promise<Object>} The server status
     */
    getServerStatus()

    /**
     * Fetch all past and upcoming Fortnite tournaments
     * @param {string} region The region eg. EU, ASIA, NAE
     * @param {string} platform The full platform name (Windows, Android, etc)
     * @returns {Promise<Object>} The tournaments
     */
    getTournaments(region, platform)

    /**
     * Fetch a Fortnite tournament window by id
     * @param {string} eventId The event id (eg epicgames_S13_FNCS_EU_Qualifier4_PC)
     * @param {string} windowId The window id (eg S13_FNCS_EU_Qualifier4_PC_Round1)
     * @param {boolean} showLiveSessions Whether to show live sessions
     * @param {number} page The starting page
     * @returns {Promise<Object>} The tournament window
     */
    getTournamentWindow(eventId, windowId, showLiveSessions, page)

    /**
     * Fetch all available radio stations
     * @returns {Promise<Object>} Radio stations
     */
    getRadioStations()

    /**
     * Download a radio stream
     * @param {string} id The stream id (use getRadioStations)
     * @param {Language} language The stream language
     * @returns {Promise<Buffer>} The m3u8 audio file as a Buffer
     * @example
     * fs.writeFile('./stream.m3u8', await client.getRadioStream('BXrDueZkosvNvxtx', Enums.Language.ENGLISH));
     * in cmd: ffmpeg -protocol_whitelist https,file,tcp,tls -i stream.m3u8 -ab 211200 radio.mp3
     */
    getRadioStream(id, language)

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
    getBlurlVideo(id, language, resolution)

    /**
     * Download a tournament match by its session id
     * @param {string} sessionId The game session id (eg in getTournamentWindow's sessions)
     * @param {?Array} downloads Which replay data to fetch
     * @param {?BufferEncoding} outputEncoding The encoding for binary data
     * @returns {Object} The replay json data
     */
    getTournamentReplay(sessionId, downloads, outputEncoding)
}
export { Client, Enum }