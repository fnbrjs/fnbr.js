module.exports = Object.freeze({
  // AUTH
  LOGIN_REPUTATION: 'https://www.epicgames.com/id/api/reputation',
  LOGIN_CSRF: 'https://www.epicgames.com/id/api/csrf',
  LOGIN: 'https://www.epicgames.com/id/api/login',
  LOGIN_EXCHANGE: 'https://www.epicgames.com/id/api/exchange',
  OAUTH_TOKEN_CREATE: 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token',
  OAUTH_TOKEN_VERIFY: 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/verify',
  OAUTH_TOKEN_KILL: 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/sessions/kill',
  OAUTH_TOKEN_KILL_MULTIPLE: 'https://account-public-service-prod.ol.epicgames.com/account/api/oauth/sessions/kill',
  OAUTH_EXCHANGE: 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/exchange',
  OAUTH_DEVICE_AUTH: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
  OAUTH_DEVICE_CODE: 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/deviceAuthorization',

  // INITIAL SETUP
  INIT_EULA: 'https://eulatracking-public-service-prod-m.ol.epicgames.com/eulatracking/api/public/agreements/fn',
  INIT_GRANTACCESS: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/grant_access',

  // XMPP
  XMPP_SERVER: 'xmpp-service-prod.ol.epicgames.com',
  EPIC_PROD_ENV: 'prod.ol.epicgames.com',

  // BATTLE ROYALE
  BR_STATS_V2: 'https://statsproxy-public-service-live.ol.epicgames.com/statsproxy/api/statsv2',
  BR_SERVER_STATUS: 'https://lightswitch-public-service-prod06.ol.epicgames.com/lightswitch/api/service/bulk/status?serviceId=Fortnite',
  BR_STORE: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/storefront/v2/catalog',
  BR_NEWS: 'https://fortnitecontent-website-prod07.ol.epicgames.com/content/api/pages/fortnite-game',
  BR_EVENT_FLAGS: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/calendar/v1/timeline',
  BR_SAC_SEARCH: 'https://payment-website-pci.ol.epicgames.com/affiliate/search-by-slug',
  BR_PARTY: 'https://party-service-prod.ol.epicgames.com/party/api/v1/Fortnite',
  BR_TOURNAMENTS: 'https://events-public-service-prod.ol.epicgames.com/api/v1/events/Fortnite/data',
  BR_TOURNAMENTS_DOWNLOAD: 'https://events-public-service-live.ol.epicgames.com/api/v1/events/Fortnite/download',
  BR_TOURNAMENT_WINDOW: 'https://events-public-service-live.ol.epicgames.com/api/v1/leaderboards/Fortnite',
  BR_STREAM: 'https://fortnite-vod.akamaized.net',
  BR_REPLAY: 'https://datastorage-public-service-live.ol.epicgames.com/api/v1/access/fnreplays/public',
  BR_REPLAY_METADATA: 'https://datastorage-public-service-live.ol.epicgames.com/api/v1/access/fnreplaysmetadata/public',

  // ACCOUNT
  ACCOUNT_MULTIPLE: 'https://account-public-service-prod.ol.epicgames.com/account/api/public/account',
  ACCOUNT_DISPLAYNAME: 'https://account-public-service-prod03.ol.epicgames.com/account/api/public/account/displayName',
  ACCOUNT_ID: 'https://account-public-service-prod03.ol.epicgames.com/account/api/public/account',
  ACCOUNT_EMAIL: 'https://account-public-service-prod03.ol.epicgames.com/account/api/public/account/email',
  MCP: 'https://fortnite-public-service-prod11.ol.epicgames.com/fortnite/api/game/v2/profile',

  // FRIENDS
  FRIENDS: 'https://friends-public-service-prod.ol.epicgames.com/friends/api',
  FRIEND_ADD: 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/friends',
  FRIEND_DELETE: 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/v1',
  FRIEND_BLOCK: 'https://friends-public-service-prod06.ol.epicgames.com/friends/api/public/blocklist',

  // SERVER STATUS
  SERVER_STATUS_SUMMARY: 'https://ft308v428dv3.statuspage.io/api/v2/summary.json',
});
