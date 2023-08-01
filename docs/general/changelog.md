# Changelog

## 4.0.0

### Additions
* *WIP*

### Changes
* Documentation
  * Updated examples

### Fixes
* *WIP*

<hr>

## 3.1.6

### Additions
* Party
  * Added a `path` property to `ClientPartyMember#setOutfit()`, `ClientPartyMember#setBackpack()`, `ClientPartyMember#setPet()`, `ClientPartyMember#setPickaxe()`, `ClientPartyMember#setEmote()` and `ClientPartyMember#setEmoji()`

### Fixes
* Endpoints
  * Updated hosts

<hr>

## 3.1.5

### Fixes
* Party
  * Fixed an issue that caused all party members to be invisible if the bot created the party

<hr>

## 3.1.4

### Fixes
* Stats
  * Fix an issue that caused `Client#getBRStats()` to throw an error when the user had stats keys that were not parsed properly
* User Search
  * Fix an issue that caused `Client#searchProfiles()` to throw an error if a search result could not be resolved

<hr>

## 3.1.3

### Fixes
* Creative Discovery
  * Updated to new the new discovery endpoint

<hr>

## 3.1.2

### Fixes
* Battle Royale Stats
  * Fixed an issue that caused values like k/d and winrate to be Infinity instead of 0
* HTTP Ratelimit handling
  * The HTTP client now properly handles ratelimits on the user search api (`Client#searchProfiles()`)

<hr>

## 3.1.1

### Fixes
* Client Reconnecting
  * Fixed an issue that caused the client to ignore `ClientOptions#fetchFriends`,
    `ClientOptions#createParty` and `ClientOptions#forceParty` when reconnecting
* Tournaments
  * Fixed an issue that caused some tournaments to not be returned by `Client#getTournaments()`
* STW Stats
  * Fixed `STWStats#level` and `STWStats#rewardsClaimedPostMaxLevel` being `NaN` in rare cases

<hr>

## 3.1.0

### Changes
* Server Status
  * **(Breaking)** `Client#getFortniteServerStatus` now returns a `FortniteServerStatus` instance
  * **(Breaking)** `Client#getEpicgamesServerStatus` now returns a `EpicgamesServerStatus` instance

### Fixes
* STW Profiles
  * Fixed a few issues that made `Client#getSTWProfile` incorrectly throw an error in rare cases
* Tournament Session Downloading
  * Improved error handling for downloading tournament replays and tournament session metadata
* Blurl Streams
  * Improvements for downloading blurl streams (blurl streams would not get parsed correctly in rare cases)
* Docs Examples
  * Fixed "refreshtoken" and "fortniteapicom" examples

<hr>

## 3.0.0

### Additions
* Enums
  * Added `XBOX_SERIES_X` and `PLAYSTATION_5` to the `Platform` enum
  * Added the `STWLeadSynergy` enum
  * Added the `PresenceOnlineType` enum
* Client Config
  * Added `ClientOptions#language`
  * Added `ClientOptions#statsPlaylistTypeParser`
  * Added comments to many config options
* Friend Online And Offline Events
  * Added `Client#friend:online` and `Client#friend:offline` events
  * Added `ClientOptions#friendOnlineConnectionTimeout`
* Launcher Refresh Token Auth
  * Added `AuthOptions#createLauncherSession`
  * Reworked launcher refresh token auth to ensure that a token will always be created
* Save The World Profiles
  * Added `Client#getSTWProfile()`
  * Can be used to calculate a profile's power level, fetch its survivors, etc
* Save The World Info
  * Added `Client#getSTWWorldInfo()`
* Party Refreshing
  * Added `Party#fetch()`
* Client Party Member
  * Added `ClientPartyMember#setCrowns()`
* Party Member State Updated Events
  * Added `Client#party:member:outfit:updated`
  * Added `Client#party:member:backpack:updated`
  * Added `Client#party:member:emote:updated`
  * Added `Client#party:member:pickaxe:updated`
  * Added `Client#party:member:readiness:updated`
  * Added `Client#party:member:matchstate:updated`

### Changes
* Party Fetching
  * Added `raw` parameter to `Client#getParty()` that will make the method return the raw party data
  * `Client#getParty()` now handles errors correctly
* Stats
  * **(Breaking)** `Client#getBRStats()` now returns a `Stats` object
* News
  * **(Breaking)** Removed `Client#getNews()`
  * Added `Client#getBRNews()`
  * Added `Client#getSTWNews()`
* Battle Royale Account Level
  * **(Breaking)** `Client#getBRAccountLevel()` now returns a `BRAccountLevelData` object
* Event Tokens
  * **(Breaking)** `Client#getEventTokens()` now returns a `EventTokens` object

### Fixes
* Fortnite EULA Accept Method
  * Fixed an issue that occured when Fortnite was bought on an account but never actually launched
* Client Presence Sweeping
  * Fixed the documentation of the `maxLifetime` parameter of `Client#sweepPresences()`
* HTTP Auth Error Handling
  * Fixed an issue that affected automatic token refreshing
* Refresh Token Auth
  * Fixed an issue that occured when the client was kept running longer than the refresh token's lifetime
* XMPP PARTY_MEMBER_EXPIRED Error
  * Fixed an error that occured when the client handled its own party member expiration event
* XMPP Presences
  * Fixed an issue that caused the presence cache to be populated very slower
* XBOX External Auth
  * Added `ExternalAuths#xbl`
* Party Join Requests
  * Fixed `sender` and `receiver` being swapped
* Party Invites
  * Fixed an issue that caused party member display names to be undefined

<hr>

## 2.4.0

### Additions
* Global Profile
  * Added `Client#getGlobalProfile()` and `User#getGlobalProfile()`
* Avatars
  * Added `Client#getUserAvatar()` and `User#getAvatar()`
* Friend Offer Ownership
  * Added `Client#checkFriendOfferOwnership()` and `Friend#checkOfferOwnership()`

### Changes
* Party Member Properties
  * The client will now wait for a member update message before `Client#party:member:joined` is being emitted
* Battle Royale Account Level
  * **(Breaking)** `User#getBRAccountLevel()` will now return the account level data directly, instead of an array with one entry

### Fixes
* Multiple Display Name Lookups
  * `Client#getProfile()` will no longer throw an error if one of the user display name lookups fail
* Party Member Emote
  * Trying to access `PartyMember#emote` will no longer throw an error if an emote is not set

<hr>

## 2.3.0

### Additions
* Battle Royale Account Level
  * Added `Client#getBRAccountLevel()` and `User#getBRAccountLevel()`
* Storefront Keychain
  * Added `Client#getStorefrontKeychain()`
* Mutual Friends
  * Added `Client#getMutualFriends()` and `Friend#getMutualFriends()`
* Tournament Session Metadata
  * Added `Client#getTournamentSessionMetadata()`
* Season Timestamps
  * Added season end timestamp for CH2_S8
  * Added season start timestamp for CH3_S1
* Class exports
  * Added exports for all classes and exceptions

<hr>

## 2.2.0

### Additions
* Tournament Tokens
  * Added `Client#getEventTokens()`
  * Can be used to fetch arena divisions of any season, check tournament eligiblity and more

### Changes
* Auth Refreshing
  * Added a config option to control what the client will do in case the refresh token is invalid (`ClientOptions#restartOnInvalidRefresh`)
  * Removed `ClientOptions#tokenVerifyInterval`
  * Improved error messages for auth refresh errors
* Fortnite News
  * Added the new battle royale MOTD news endpoint to `Client#getNews()`

### Fixes
* Auth Refreshing
  * Fixed an issue that caused the client to not reauthenticate properly
* Device Auths
  * Readded support for device auths in snake case (was removed in 2.0.0)

<hr>

## 2.1.0

### Additions
* Tournament replays
  * This method returns a `Buffer` for an actual .replay file (which can be even used ingame)
  * Config options allow you to only download specific data
  * Added `Client#downloadTournamentReplay()`
* Authentication
  * Added an alternative to device auths (since they're known for causing password resets)
  * A launcher refresh token lasts for 30 days and needs to be refreshed each time you authenticate (using the event)
  * Click [here](https://fnbr.js.org/#/docs/main/stable/examples/refreshtoken) for an example
  * Added the `Client#refreshtoken:created` event
  * Added `AuthOptions#launcherRefreshToken`
* Creative Island Lookup
  * Added `Client#getCreativeIsland()`
* Creative Discovery Surface
  * Added `Client#getCreativeDiscoveryPanels()`

<hr>

## 2.0.2

### Fixes
* Friend Caches
  * Fixed an issue that caused the friend cache to hold no values
* Client Config
  * Fixed missing documentation for some `ClientOptions` properties

<hr>

## 2.0.1

### Additions
* Season Timestamps
  * Added season end timestamp for CH2_S7
  * Added season start timestamp for CH2_S8

### Fixes
* Parties
  * Fixed `ClientParty#hideMembers()` (did not hide members properly)

<hr>

## 2.0.0

### Additions
* TypeScript Rewrite
  * The library has been completely rewritten in TypeScript
  * Type definitions for all classes
  * Better intellisense
  * Improved documentation
* Exceptions
  * Custom errors that extend `Error` were added. Examples: `FriendNotFoundError`, `FriendshipRequestAlreadySentError`
  * Documentation has been added for the exceptions a method could potentially throw
* Request To Join
  * Added `Client#sendRequestToJoin()`
  * Added `Client#party:joinrequest`
  * Added `Friend#sendJoinRequest()`
* Blurl Streams
  * Added `Client#downloadBlurlStream()`
  * Added `Client#getRadioStations()`
* Party Properties
  * Added `Party#squadFill`
  * Added `Party#playlist`
  * Added `Party#customMatchmakingKey`
* Client Party Methods
  * Added `ClientParty#hideMember()`
  * Added `ClientParty#setMaxSize()`
  * Added `ClientParty#setSquadFill()`
* Party Member Properties
  * PartyMember now extends User
  * Added `PartyMember#assistedChallenge`
  * Added `PartyMember#banner`
  * Added `PartyMember#battlepass`
  * Added `PartyMember#customDataStore`
  * Added `PartyMember#inputMethod`
  * Added `PartyMember#isMarkerSet`
  * Added `PartyMember#markerLocation`
  * Added `PartyMember#matchInfo`
  * Added `PartyMember#platform`
* Client Party Member Methods
  * Added `ClientPartyMember#setAssistedChallenge()`
  * Added `ClientPartyMember#setMarker()`
  * Added `ClientPartyMember#setPet()`
* Client Status
  * Added `ClientOptions#defaultOnlineType`
  * Added `Client#resetStatus()`
* User Blocking / Unblocking
  * Added `User#block()`
  * Added `BlockedUser#unblock()`
* Friend's Parties
  * Added `Friend#party`
* Client Config
  * Added `ClientOptions#cacheSettings`
  * Added `ClientOptions#connectToXMPP`
  * Added `ClientOptions#createParty`
  * Added `ClientOptions#forceNewParty`
  * Added `ClientOptions#handleRatelimits`
  * Added `ClientOptions#partyBuildId`
  * Added `ClientOptions#restRetryLimit`
  * Added `ClientOptions#tokenVerifyInterval`
  * Added `ClientOptions#fetchFriends`
* Client Methods
  * Added `Client#getParty()`
  * Added `Client#getClientParty()`
  * Added `Client#searchProfiles()`
  * Added `Client#sweepPresences()`
* Events
  * Added `Client#party:member:confirmation`
  * Added `Client#disconnected`
  * Added `Client#xmpp:chat:error`
  * Added `Client#xmpp:message:error`
  * Added `Client#xmpp:presence:error`

### Changes
* Client Status
  * **(Breaking)** Renamed `ClientOptions#status` to `ClientOptions#defaultStatus`
  * **(Breaking)** Added the parameter `onlineType` to `Client#setStatus`
* Tournaments
  * **(Breaking)** `Client#getTournaments()` now returns `Array<Tournament>`
  * **(Breaking)** Renamed `Client#getTournamentWindow()` to `Client#getTournamentWindowResults()`
* User Blocking / Unblocking
  * **(Breaking)** Renamed `Client#friend:blocked` and `Client#friend:unblocked` to `Client#user:blocked` and `Client#user:unblocked`
  * **(Breaking)** Renamed `Client#blockFriend()` and `Client#unblockFriend()` to `Client#blockUser()` and `Client#unblockUser()`
  * **(Breaking)** Renamed `Client#blockedFriends` to `Client#blockedUsers`
* Client Methods
  * **(Breaking)** Renamed `Client#getServerStatus()` to `Client#getEpicgamesServerStatus()`
  * **(Breaking)** Renamed `Client#getBRStore()` to `Client#getStorefronts()`
  * `Client#getBRStats()` now accepts an array of user IDs
  * **(Breaking)** Removed `Client#getRadioStream()` in favor of `Client#downloadBlurlStream()`

### Fixes
* Fixed Client Party Member Readiness Methods
  * Fixed `ClientPartyMember#setReadiness()`
  * Fixed `ClientPartyMember#setSittingOut()`
* Client XMPP security vulnerability
  * Fixed a vulnerability that allowed programs to emit client events
* Wait For Event Method
  * Fixed the `filter` parameter for `Client#waitForEvent()`

<hr>

## 1.4.1

### Fixes
* Parties
  * Fixed "outdated version" bug that occurred when a user tried to join the client's party

<hr>

## 1.4.0

### Additions
* Client Methods
  * Added `Client#getRadioStream()`
* Parties
  * Added `ClientPartyMember#setPlaying()`
  * Added `PartyMember#fetch()` (Used internally to resolve display names)
* Documentation
  * Added third party API examples

### Fixes
* Parties
  * Fixed extremely rare bug that caused the party to be stuck on the patching state
  * Fixed bug that prevented users from accepting the bot's party invites if its party is private
  * Fixed rare party stale revision bug
  * Fixed party voice chat icon not showing up
* Misc
  * Code style updates

<hr>

## 1.3.0

### Additions
* Parties
  * Added `Party#setPlaylist()`
  * Added `ClientPartyMember#setSittingOut()`
  * Added `ClientPartyMember#clearBackpack()`
* Client Methods
  * Added `Client#getFortniteServerStatus()`

### Fixes
* Parties
  * Updated the party build id for version 14.10 ("old version" join bug)
  * Fixed cosmetic variants
* XMPP
  * Fixed XMPP reconnection error (Thanks to [Théo](https://discord.com/users/448882532830674948) for reporting it)
  * The XMPP client will now use a new resource string each time you restart the client
* Presences
  * Fixed issue that occurred when sending a status (presence) to a single friend
* Client Methods
  * Fixed `Client#getNews()` returning an empty array sometimes
  * The client will now ignore errors on shutdown
* Misc
  * Updated season start and end timestamps
  * Fixed documentation for `Party#hideMembers()`

<hr>

## 1.2.0

### Additions
* Client Methods
  * Added `Client#getFortniteServerStatus()`
  * Added `Client#getTournaments()`
  * Added `Client#getTournamentWindow()`
* Parties
  * Added `PartyMember#backpack`

### Changes
* Debugging
  * Added total request time to HTTP debugging 

### Fixes
* Parties
  * Fixed error that occurred when the client accepted another bot's invites
  * Trying to join a party which the client previously got kicked from now throws an error
  * The client now handles user_has_party when trying to join a party
  * Fixed some bugs related to party invites
* Authentication Refreshing
  * The client will now reauthenticate when a request fails due to an invalid token
  * Fixed reauthentication issue

<hr>

## 1.1.0

### Additions
* Presences
  * Added `ClientOptions#cachePresences`
* Client Methods
  * Added `Client#getBREventFlags()`
* Parties
  * Added `Party#hideMembers()`
* Documentation
  * Added deviceauth example

### Changes
* Presences
  * **(Breaking)** Added `before` and `after` parameter to `Client#friend:presence`
* Parties
  * **(Breaking)** `PartyMember#outfit`, `PartyMember#pickaxe` and `PartyMember#emote` now return the ID instead of the asset path

### Fixes
* Parties
  * Fixed error that occurred when the client got kicked from its party
  * Fixed accepting party invites & joining parties

<hr>

## 1.0.3

### Additions
* JSDoc
  * Improved JSDoc for some methods
  * Added examples for variants

### Changes
* Party Privacy
  * `Party#setPrivacy()` must now use the enum

### Fixes
* Client Login
  * `Client#login()` now waits until all party properties are fully loaded
* Party Privacy
  * `Party#setPrivacy()` now updates `PartyConfig#privacy`
  * Setting the party privacy to the current one now throws an error instead of glitching out the party
* Parties
  * Fixed party issues when the xmpp client reconnects (caused -93 and -81 error codes)
  * Previous emote is now being cleared when you set it
  * You no longer have to set a delay to emote when someone joins the client's party
