declare module 'fnbr' {
  import { PathLike } from 'fs';
  import { EventEmitter } from 'events';
  import { AxiosRequestConfig } from 'axios';
  import Collection from '@discordjs/collection';

  export type StringFunction = () => string;
  export type StringFunctionAsync = () => Promise<string>;

  export type DeviceAuthFunction = () => DeviceAuth;
  export type DeviceAuthFunctionAsync = () => Promise<DeviceAuth>;

  export type DebugFunction = (message: string) => any;

  export type Platform = 'WIN' | 'MAC' | 'PSN' | 'XBL' | 'SWT' | 'IOS' | 'AND';

  export type CreatorCodeStatus = 'ACTIVE' | 'DISABLED';

  export type FortniteLanguage = 'ar' | 'de' | 'en' | 'es' | 'fr' | 'it' | 'ja' | 'pl' | 'ru' | 'tr';
  
  export type PendingFriendDirection = 'INCOMING' | 'OUTGOING';

  export type KairosColor = '["#8EFDE5", "#1CBA9E", "#034D3F"]'
                          | '["#FF81AE", "#D8033C", "#790625"]'
                          | '["#FFDF00", "#FBA000", "#975B04"]'
                          | '["#CCF95A", "#30C11B", "#194D12"]'
                          | '["#B4F2FE", "#00ACF2", "#005679"]'
                          | '["#1CA2E6", "#0C5498", "#081E3E"]'
                          | '["#FFB4D6", "#FF619C", "#7D3449"]'
                          | '["#F16712", "#D8033C", "#6E0404"]'
                          | '["#AEC1D3", "#687B8E", "#36404A"]'
                          | '["#FFAF5D", "#FF6D32", "#852A05"]'
                          | '["#E93FEB", "#7B009C", "#500066"]'
                          | '["#DFFF73", "#86CF13", "#404B07"]'
                          | '["#B35EEF", "#4D1397", "#2E0A5D"]';

  export type GameMode = 'battleroyale' | 'savetheworld' | 'creative';

  export type Region = 'EU' | 'NAW' | 'NAE' | 'ASIA' | 'BR' | 'ME';

  export type FullPlatform = 'Windows' | 'Android' | 'Playstation' | 'Xbox' | 'IOS' | 'Nintendo' | 'Mac';
  
  export interface DeviceAuth {
    accountId: string;
    deviceId: string;
    secret: string;
  }

  export interface BasicToken {
    LAUNCHER_WINDOWS: string;
    FORTNITE_WINDOWS: string;
    FORTNITE_IOS: string;
    FORTNITE_SWITCH: string;
  }

  export interface ClientAuth {
    deviceAuth?:        DeviceAuth | PathLike | DeviceAuthFunction | DeviceAuthFunctionAsync;
    exchangeCode?:      string     | PathLike | StringFunction     | StringFunctionAsync;
    authorizationCode?: string     | PathLike | StringFunction     | StringFunctionAsync;
    refreshToken?:      string     | PathLike | StringFunction     | StringFunctionAsync;
    deviceCode?:        boolean;
    checkEULA?:         boolean;
  }

  export interface PartyPrivacy {
    partyType: 'Public' | 'FriendsOnly' | 'Private';
    inviteRestriction: 'AnyMember' | 'LeaderOnly';
    onlyLeaderFriendsCanJoin: boolean;
    presencePermission: 'Anyone' | 'Noone';
    invitePermission: 'Anyone' | 'AnyMember' | 'Leader';
    acceptingMembers: boolean;
  }

  export interface PartyOptions {
    joinConfirmation?: boolean;
    joinability?: string;
    privacy?: PartyPrivacy;
    maxSize?: number;
    chatEnabled?: boolean;
  }

  export interface KairosConfig {
    cid?: string;
    color?: KairosColor;
  }

  export interface ClientOptions {
    savePartyMemberMeta?: boolean;
    http?: AxiosRequestConfig;
    debug?: DebugFunction;
    httpDebug?: boolean;
    xmppDebug?: boolean;
    status?: string;
    platform?: Platform;
    memberMeta?: object;
    keepAliveInterval?: number;
    cachePresences?: boolean;
    auth: ClientAuth;
    partyConfig?: PartyOptions;
    kairos?: KairosConfig;
  }

  export interface PresenceGameplayStats {
    kills?: number;
    fellToDeath?: boolean;
    serverPlayerCount?: number;
  }

  export interface PresenceKairosAvatar {
    asset?: string;
    background?: KairosColor;
  }

  export interface PresencePartyData {
    id?: string;
    isPrivate?: boolean;
    memberCount?: number;
    platform?: Platform;
    buildId?: string;
  }

  export interface BRShopOfferPrice {
    currencyType: string;
    currencySubType: string;
    regularPrice: number;
    dynamicRegularPrice: number;
    finalPrice: number;
    saleExpiration: Date;
    basePrice: number;
  }

  export interface BRShopOfferMeta {
    NewDisplayAssetPath: string;
    SectionId: string;
    TileSize: string;
    AnalyticOfferGroupId: string;
    ViolatorTag: string;
    ViolatorIntensity: string;
  }

  export interface BRShopOfferRequirement {
    requirementType: string;
    requiredId: string;
    minQuantity: number;
  }

  export interface BRShopOfferGiftInfo {
    bIsEnabled: boolean;
    forcedGiftBoxTemplateId: string;
    purchaseRequirements: any[];
    giftRecordIds: any[];
  }

  export interface BRShopOfferMetaInfo {
    key: string;
    value: string;
  }

  export interface BRShopOfferItemGrant {
    templateId: string;
    quantity: number;
  }

  export interface PatchQueueEntry {
    updated?: object;
    deleted?: object;
  }

  export interface Variant {
    channel: string;
    variant: string;
    dE?: number;
  }

  export interface FriendConnectionPlatform {
    name?: string;
  }

  export interface FriendConnections {
    psn?: FriendConnectionPlatform;
    xbl?: FriendConnectionPlatform;
    nintendo?: FriendConnectionPlatform;
  }

  export interface NewsImages {
    image: string;
    tileImage: string;
  }

  export interface NewsVideo {
    id: string;
    name: string;
    mute: boolean;
    loop: boolean;
    streamingEnabled: boolean;
    autoplay: boolean;
    fullscreen: boolean;
  }

  export interface NewsOffer {
    id: string;
    action: string;
  }

  export interface PartyConfig {
    joinConfirmation: boolean;
    joinability: 'OPEN' | string;
    maxSize: number;
    chatEnabled: boolean;
    type: 'DEFAULT' | string;
    discoverability: 'ALL' | string;
    subType: 'default' | string;
    inviteTtl: number;
  }

  export abstract class Base {
    constructor(client: Client);

    public client: Client;
  }

  export abstract class BaseManager<K, Holds> extends Base {
    constructor(client: Client, holds: Holds, iterable?: Array<Holds>);

    private holds: Holds;
    private add(data: object, id: string): Promise<object>;

    public cache: Collection<K, Holds>;
    public resolve(resolvable: string | object): Promise<Holds | null>;
  }

  export class BlockedUser extends User {
    constructor(client: Client, data: object);

    public unblock(): Promise<void>;
  }

  export class BlockedUserManager extends BaseManager<string, BlockedUser> {
    constructor(client: Client);
  }

  export class BRShop {
    constructor(data: object);

    public daily: BRShopOffer;
    public featured: BRShopOffer;
    public specialDaily: BRShopOffer;
    public specialFeatured: BRShopOffer;
  }

  export class BRShopOffer {
    constructor(shop: BRShop, data: object);

    public id: string;
    public devName: string;
    public fulfillmentIds: any[];
    public dailyLimit: number;
    public weeklyLimit: number;
    public monthlyLimit: number;
    public categories: string[];
    public prices: BRShopOfferPrice[];
    public meta: BRShopOfferMeta;
    public matchFilter: string;
    public filterWeight: number;
    public appStoreId: any[];
    public requirements: BRShopOfferRequirement[];
    public type: string;
    public giftInfo: BRShopOfferGiftInfo;
    public refundable: boolean;
    public metaInfo: BRShopOfferMeta[];
    public itemGrants: BRShopOfferItemGrant[];
    public additionalGrants: any[];
    public sortPriority: number;
    public catalogGroupPriority: number;
    public displayAssetPath: string;
  }

  export class Client extends EventEmitter {
    constructor(args: ClientOptions);

    private auth: object;
    private http: object;
    private lastMemberMeta: object | undefined;
    private xmpp: object;
    private debug(message: string): void;
    private initParty(create: boolean): Promise<void>;
    private makeCamelCase(input: object): object;
    private mergeDefault(defaultObject: object, givenObject: object): object;
    private parseError(errorMessage: string | object): string;
    private static consoleQuestion(question: string): Promise<string>;
    private static makeCamelCase(input: object): object;
    private static mergeDefault(defaultObject: object, givenObject: object): object;
    private static sleep(duration: number): Promise<void>;

    public options: ClientOptions;
    public friends: FriendManager;
    public isReady: boolean;
    public party: Party | undefined;
    public user: ClientUser | undefined;
    public addFriend(user: string): Promise<void>;
    public blockUser(user: string): Promise<void>;
    public getBlurlVideo(id: string, language?: FortniteLanguage, resolution?: string): Promise<Buffer>;
    public getBREventFlags(language?: FortniteLanguage): Promise<object>;
    public getBRStats(user: string, startTime?: number, endTime?: number): Promise<object>;
    public getBRStore(language?: FortniteLanguage): Promise<BRShop>;
    public getCreatorCode(code: string): Promise<CreatorCode>;
    public getFortniteServerStatus(): Promise<object>;
    public getNews(mode?: GameMode, language?: FortniteLanguage): Promise<Array<NewsMessage>>;
    public getProfile(query: string): Promise<User | undefined>;
    public getRadioStations(): Promise<object>;
    public getRadioStream(id: string, language?: FortniteLanguage): Promise<Buffer>;
    public getServerStatus(): Promise<Object>;
    public getTournamentReplay(sessionId: string, downloads?: Array<string>, outputEncoding?: BufferEncoding): Promise<object>;
    public getTournaments(region: Region, platform: FullPlatform): Promise<object>;
    public getTournamentWindow(eventId: string, windowId: string, showLiveSessions?: boolean, page?: number): Promise<object>;
    public invite(friend: string): Promise<SentPartyInvitation>;
    public login(): Promise<void>;
    public logout(): Promise<void>;
    public removeFriend(): Promise<void>;
    public restart(): Promise<void>;
    public sendFriendMessage(friend: string, message: string): Promise<FriendMessage>;
    public setStatus(status?: string, to?: string): Promise<void>;
    public unblockUser(user: string): Promise<void>;
    public waitForEvent(event: string, timeout?: number, filter?: (eventData: any) => boolean): Promise<any>;
    public waitUntilReady(timeout?: number): Promise<void>;
    
    public on(event: 'deviceauth:created', listener: (deviceAuth: DeviceAuth) => void): this;
    public on(event: 'devicecode:prompt', listener: (deviceCodeUrl: string) => void): this;
    public on(event: 'friend:added', listener: (friend: Friend) => void): this;
    public on(event: 'friend:message', listener: (friendMessage: FriendMessage) => void): this;
    public on(event: 'friend:presence', listener: (beforePresence: FriendPresence | undefined, currentPresence: FriendPresence) => void): this;
    public on(event: 'friend:removed', listener: (removedFriend: Friend) => void): this;
    public on(event: 'friend:request', listener: (pendingFriend: PendingFriend) => void): this;
    public on(event: 'friend:request:aborted', listener: (pendingFriend: PendingFriend) => void): this;
    public on(event: 'friend:request:rejected', listener: (pendingFriend: PendingFriend) => void): this;
    public on(event: 'friend:request:sent', listener: (pendingFriend: PendingFriend) => void): this;
    public on(event: 'party:invite', listener: (invite: PartyInvitation) => void): this;
    public on(event: 'party:invite:declined', listener: (friend: Friend) => void): this;
    public on(event: 'friend:request:aborted', listener: (pendingFriend: PendingFriend) => void): this;
    public on(event: 'party:member:disconnected', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:expired', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:joined', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:kicked', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:left', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:message', listener: (partyMemberMessage: PartyMessage) => void): this;
    public on(event: 'party:member:promoted', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:member:updated', listener: (partyMember: PartyMember) => void): this;
    public on(event: 'party:updated', listener: (party: Party) => void): this;
    public on(event: 'ready', listener: () => void): this;
    public on(event: 'user:blocked', listener: (blockedUser: BlockedUser) => void): this;
    public on(event: 'user:unblocked', listener: (blockedUser: BlockedUser) => void): this;
  }

  export class ClientPartyMember extends PartyMember {
    constructor(party: Party, data: object);
    
    private currentlyPatching: boolean;
    private patchQueue: Array<PatchQueueEntry>;
    private revision: number;
    private sendPatch(updated: object, isForced?: boolean): Promise<void>;

    public clearBackpack(): Promise<void>;
    public clearEmote(): Promise<void>;
    public setBackpack(bid: string, variants?: Array<Variant>): Promise<void>;
    public setBanner(banner: string, color: number): Promise<void>;
    public setBattlepass(isPurchased?: boolean, level?: number, selfBoost?: number, friendBoost?: number): Promise<void>;
    public setEmoji(emoji: string): Promise<void>;
    public setEmote(eid: string): Promise<void>;
    public setLevel(level: number): Promise<void>;
    public setOutfit(cid: string, variants?: Array<Variant>, enlightment?: [number, number]): Promise<void>;
    public setPickaxe(pickaxe: string, variants?: Array<Variant>): Promise<void>;
    public setPlaying(isPlaying?: boolean, playerCount?: number, startedAt?: string): Promise<void>;
    public setReadiness(ready: boolean): Promise<void>;
    public setSittingOut(sittingOut: boolean): Promise<void>;
  }

  export class ClientUser extends User {
    constructor(client: Client, data: object);

    public ageGroup: string;
    public canUpdateDisplayName: boolean;
    public country: string;
    public email: string;
    public emailVerified: boolean;
    public failedLoginAttempts: number;
    public headless: string;
    public lastLogin: Date; 
    public lastName: string;
    public minorExpected: boolean;
    public minorStatus: string;
    public minorVerified: boolean;
    public name: string;
    public numberOfDisplayNameChanges: number;
    public preferredLanguage: string;
    public tfaEnabled: boolean;
  }

  export class CreatorCode {
    constructor(client: Client, data: object);

    public code: string;
    public owner: User;
    public status: CreatorCodeStatus;
    public verified: boolean;
  }

  export class Friend extends User {
    constructor(client: Client, data: object);

    public alias: string;
    public connections: FriendConnections;
    public createdAt: Date | undefined;
    public favorite: boolean;
    public isJoinable: boolean;
    public isOnline: boolean;
    public mutualFriends: number;
    public note: string;
    public presence: FriendPresence | undefined;
    public invite(): Promise<void>;
    public joinParty(): Promise<void>;
    public remove(): Promise<void>;
    public sendMessage(message: string): Promise<void>;
  }

  export class FriendManager extends BaseManager<string, Friend> {
    constructor(client: Client);

    public blocked: BlockedUserManager;
    public pending: PendingFriendManager;
  }

  export class FriendMessage {
    constructor(client: Client, data: object);

    public author: Friend;
    public content: string;
    public reply(message: string): Promise<FriendMessage>;
  }

  export class FriendPresence {
    constructor(client: Client, data: object, fromId: string);

    public avatar: PresenceKairosAvatar;
    public friend: Friend;
    public gameplayStats: PresenceGameplayStats;
    public gameSessionJoinKey: string | undefined;
    public hasVoiceSupport: boolean;
    public homebaseRating: number | undefined;
    public isInKairos: boolean;
    public isInUnjoinableMatch: boolean;
    public isJoinable: boolean;
    public isPlaying: boolean;
    public partyData: PresencePartyData;
    public partyMaxSize: number | undefined;
    public partySize: number | undefined;
    public playlist: string | undefined;
    public recievedAt: Date;
    public sessionId: string | undefined;
    public status: string;
    public subGame: number | undefined;
  }

  export class NewsMessage {
    constructor(client: Client, data: object);

    public body: string;
    public buttonTextOverwrite: string | undefined;
    public entryType: string | undefined;
    public hidden: boolean;
    public id: string;
    public images: NewsImages;
    public offer: NewsOffer | undefined;
    public sortingPriority: number;
    public spotlight: boolean;
    public tabTitleOverwrite: string | undefined;
    public title: string;
    public video: NewsVideo | undefined;
    public downloadVideo(language?: FortniteLanguage, resolution?: string): Promise<Buffer>;
  }

  export class Party {
    constructor(client: Client, data: object);

    private chat: object;
    private currentlyPatching: boolean;
    private meta: object;
    private patchAssignmentsLocked: boolean;
    private patchQueue: Array<PatchQueueEntry>;
    private revision: number;
    private patchPresence(): Promise<void>;
    private refreshSquadAssignments(): Promise<void>;
    private sendPatch(updated?: object, deleted?: object, isForced?: boolean): Promise<void>;
    private update(data: object): void;

    public config: PartyConfig;
    public createdAt: Date;
    public id: string;
    public isPrivate: boolean;
    public leader: PartyMember;
    public me: ClientPartyMember;
    public members: Collection<string, PartyMember>;
    public hideMembers(hide?: boolean): Promise<void>;
    public invite(friend: string): Promise<SentPartyInvitation>;
    public join(): Promise<void>;
    public kick(member: string): Promise<void>;
    public leave(createNew?: boolean): Promise<void>;
    public promote(member: string): Promise<void>;
    public setCustomMatchmakingKey(key: string): Promise<void>;
    public setPlaylist(playlist: string): Promise<void>;
    public setPrivacy(privacy: PartyPrivacy, patch?: boolean): Promise<void>;
    public static Create(client: Client, config?: PartyOptions): Promise<Party>;
    public static Lookup(client: Client, id: string): Promise<Party>;
    public static LookupSelf(client: Client): Promise<Party>;
  }

  export class PartyInvitation {
    constructor(client: Client, data: object);
    
    private static createInvite(client: Client, pingerId: string, data: object): object;

    public createdAt: Date;
    public expired: boolean;
    public expiresAt: Date;
    public party: Party;
    public sender: Friend;
    public accept(): Promise<void>;
    public decline(): Promise<void>;
  }

  export class PartyMember {
    constructor(party: Party, data: object);

    private meta: object;
    private role: 'CAPTAIN' | '';
    private fetch(): Promise<void>;
    private update(data: object): void;

    public backpack: string;
    public displayName: string;
    public emote: string;
    public id: string;
    public isLeader: boolean;
    public isReady: boolean;
    public joinedAt: Date;
    public outfit: string;
    public pickaxe: string;
    public kick(): Promise<void>;
    public promote(): Promise<void>;
  }

  export class PartyMessage {
    constructor(client: Client, data: object);

    public author: Friend;
    public content: string;
    public reply(message: string): Promise<PartyMessage>;
  }

  export class PendingFriend {
    constructor(client: Client, data: object);

    public createdAt: Date | undefined;
    public direction: PendingFriendDirection;
    public accept(): Promise<Friend>;
    public reject(): Promise<void>;
    public abort(): Promise<void>;
  }

  export class PendingFriendManager extends BaseManager<string, PendingFriend> {
    constructor(client: Client);
  }

  export class SentPartyInvitation {
    constructor(client: Client, party: Party, receiver: Friend, data: object);

    public createdAt: Date;
    public expired: boolean;
    public party: Party;
    public reciever: Friend;
    public cancel(): Promise<void>;
    public resend(): Promise<void>;
  }

  export class User {
    constructor(client: Client, data: object);

    public displayName: string;
    public externalAuths: object;
    public id: string;
    public links: object;
    public addFriend(): Promise<void>;
    public block(): Promise<void>;
    public fetch(): Promise<User>;
    public fetchStats(startTime: number, endTime: number): Promise<object>;
  }
}