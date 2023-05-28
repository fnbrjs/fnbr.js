export default Object.freeze({
  // AUTH
  LOGIN_REPUTATION: 'https://www.epicgames.com/id/api/reputation',
  LOGIN_CSRF: 'https://www.epicgames.com/id/api/csrf',
  LOGIN: 'https://www.epicgames.com/id/api/login',
  LOGIN_EXCHANGE: 'https://www.epicgames.com/id/api/exchange',
  OAUTH_TOKEN_CREATE: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/token',
  OAUTH_TOKEN_VERIFY: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/verify',
  OAUTH_TOKEN_KILL: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/sessions/kill',
  OAUTH_TOKEN_KILL_MULTIPLE: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/sessions/kill',
  OAUTH_EXCHANGE: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/exchange',
  OAUTH_DEVICE_AUTH: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
  OAUTH_DEVICE_CODE: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/deviceAuthorization',

  // INITIAL SETUP
  INIT_EULA: 'https://eulatracking-public-service-prod-m.ol.epicgames.com/eulatracking/api/public/agreements/fn',
  INIT_GRANTACCESS: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/grant_access',

  // XMPP
  XMPP_SERVER: 'xmpp-service-prod.ol.epicgames.com',
  EPIC_PROD_ENV: 'prod.ol.epicgames.com',

  // BATTLE ROYALE
  BR_STATS_V2: 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2',
  BR_SERVER_STATUS: 'https://lightswitch-public-service-prod06.ol.epicgames.com/lightswitch/api/service/bulk/status?serviceId=Fortnite',
  BR_STORE: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/storefront/v2/catalog',
  BR_STORE_KEYCHAIN: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/storefront/v2/keychain?numKeysDownloaded=0',
  BR_NEWS: 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game',
  BR_NEWS_MOTD: 'https://prm-dialogue-public-api-prod.edea.live.use1a.on.epicgames.com/api/v1/fortnite-br/surfaces/motd/target',
  BR_EVENT_FLAGS: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
  BR_SAC_SEARCH: 'https://payment-website-pci.ol.epicgames.com/affiliate/search-by-slug',
  BR_SAC: 'https://affiliate-public-service-prod.ol.epicgames.com/affiliate/api/public/affiliates/slug',
  BR_PARTY: 'https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite',
  BR_TOURNAMENTS: 'https://events-public-service-live.ol.epicgames.com/api/v1/events/Fortnite/data',
  BR_TOURNAMENTS_DOWNLOAD: 'https://events-public-service-live.ol.epicgames.com/api/v1/events/Fortnite/download',
  BR_TOURNAMENT_WINDOW: 'https://events-public-service-live.ol.epicgames.com/api/v1/leaderboards/Fortnite',
  BR_TOURNAMENT_TOKENS: 'https://events-public-service-live.ol.epicgames.com/api/v1/players/Fortnite/tokens',
  BR_STREAM: 'https://fortnite-vod.akamaized.net',
  BR_REPLAY: 'https://datastorage-public-service-live.ol.epicgames.com/api/v1/access/fnreplays/public',
  BR_REPLAY_METADATA: 'https://datastorage-public-service-live.ol.epicgames.com/api/v1/access/fnreplaysmetadata/public',
  BR_GIFT_ELIGIBILITY: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/storefront/v2/gift/check_eligibility',

  // CREATIVE
  CREATIVE_ISLAND_LOOKUP: 'https://links-public-service-live.ol.epicgames.com/links/api/fn/mnemonic',
  CREATIVE_DISCOVERY: 'https://fn-service-discovery-live-public.ogs.live.on.epicgames.com/api/v1/discovery/surface',

  // SAVE THE WORLD
  STW_WORLD_INFO: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/world/info',

  // ACCOUNT
  ACCOUNT_MULTIPLE: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
  ACCOUNT_DISPLAYNAME: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/displayName',
  ACCOUNT_ID: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
  ACCOUNT_EMAIL: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account/email',
  ACCOUNT_SEARCH: 'https://user-search-service-prod.ol.epicgames.com/api/v1/search',
  ACCOUNT_AVATAR: 'https://avatar-service-prod.identity.live.on.epicgames.com/v1/avatar',
  ACCOUNT_GLOBAL_PROFILE: 'https://global-profile-service.game-social.epicgames.com/profiles',
  MCP: 'https://fngw-mcp-gc-livefn.ol.epicgames.com/fortnite/api/game/v2/profile',

  // FRIENDS
  FRIENDS: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/v1',
  FRIEND_ADD: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/public/friends',
  FRIEND_DELETE: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/v1',
  FRIEND_BLOCK: 'https://friends-public-service-prod.ol.epicgames.com/friends/api/public/blocklist',

  // SERVER STATUS
  SERVER_STATUS_SUMMARY: 'https://ft308v428dv3.statuspage.io/api/v2/summary.json',

  // GRAPH QL
  GRAPHQL: 'https://graphql.epicgames.com/graphql',
});
