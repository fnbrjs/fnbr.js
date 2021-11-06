/* eslint-disable camelcase */
import { AxiosError } from 'axios';
import EpicgamesAPIError from '../src/exceptions/EpicgamesAPIError';
import EpicgamesGraphQLError from '../src/exceptions/EpicgamesGraphQLError';
import { FullPlatform, Region } from './structs';

export interface HTTPResponse {
  response?: any;
  error?: AxiosError;
}

export interface EpicgamesAPIErrorData {
  errorCode: string;
  errorMessage: string;
  messageVars: string[];
  numericErrorCode: number;
  originatingService: string;
  intent: string;
  error_description: string;
  error: string;
  errorStatus?: number;
}

export interface EpicgamesGraphQLErrorLocation {
  line: number;
  column: number;
}

export interface EpicgamesGraphQLErrorData {
  message: string;
  locations: EpicgamesGraphQLErrorLocation[];
  correlationId: string;
  serviceResponse?: string;
  stack?: string;
  path: string[];
}

export interface EpicgamesAPIResponse {
  error?: EpicgamesAPIError;
  response?: any;
}

export interface EpicgamesGraphQLResponse {
  error?: EpicgamesGraphQLError | EpicgamesAPIError | AxiosError;
  response?: any;
}

export interface EpicgamesOAuthData {
  access_token: string;
  expires_in: number;
  expires_at: string;
  token_type: string;
  refresh_token: string;
  refresh_expires: number;
  refresh_expires_at: string;
  account_id: string;
  client_id: string;
  internal_client: boolean;
  client_service: string;
  displayName: string;
  app: string;
  in_app_id: string;
  device_id: string;
}

export interface EpicgamesOAuthResponse extends EpicgamesAPIResponse {
  response?: EpicgamesOAuthData;
}

export type PlatformMappings = {
  // eslint-disable-next-line no-unused-vars
  [key in FullPlatform]?: string;
}

export type RegionMappings = {
  // eslint-disable-next-line no-unused-vars
  [key in Region]?: string;
}

export interface TournamentMetadata {
  minimumAccountLevel: number;
  pool: string;
  AccountLockType: string;
  TeamLockType: string;
  DisqualifyType: string;
  RegionLockType: string;
}

export interface TournamentWindowBlackoutPeriod {
  beginTime: string;
  endTime: string;
  recurrence: string;
}

export interface TournamentWindowScoreLocation {
  scoreMode: string;
  scoreId: string;
  leaderboardId: string;
  useIndividualScores?: boolean;
}

export interface TournamentWindowMetadata {
  RoundType: string;
  ThresholdToAdvanceDivision: number;
  divisionRank: number;
  ServerReplays?: boolean;
  ScheduledMatchmakingInitialDelaySeconds?: number;
  SubgroupId: string;
  ScheduledMatchmakingMatchDelaySeconds?: number;
  liveSpectateAccessToken: string;
}

export interface TournamentWindowData {
  eventWindowId: string;
  eventTemplateId: string;
  countdownBeginTime: string;
  beginTime: string;
  endTime: string;
  blackoutPeriods: TournamentWindowBlackoutPeriod[];
  round: number;
  payoutDelay: number;
  isTBD: boolean;
  canLiveSpectate: boolean;
  scoreLocations: TournamentWindowScoreLocation[];
  visibility: string;
  requireAllTokens: string[];
  requireAnyTokens: string[];
  requireNoneTokensCaller: string[];
  requireAllTokensCaller: any[];
  requireAnyTokensCaller: any[];
  additionalRequirements: string[];
  teammateEligibility: string;
  metadata: TournamentWindowMetadata;
}

export interface TournamentData {
  gameId: string;
  eventId: string;
  regions: Region[];
  regionMappings: RegionMappings;
  platforms: FullPlatform[];
  platformMappings: PlatformMappings;
  displayDataId: string;
  eventGroup: string;
  announcementTime: string;
  appId?: any;
  environment?: any;
  metadata: TournamentMetadata;
  eventWindows: TournamentWindowData[];
  beginTime: string;
  endTime: string;
}

export interface TournamentDisplayData {
  title_color: string;
  loading_screen_image: string;
  background_text_color: string;
  background_right_color: string;
  poster_back_image: string;
  _type: string;
  pin_earned_text: string;
  tournament_display_id: string;
  schedule_info: string;
  primary_color: string;
  flavor_description: string;
  poster_front_image: string;
  short_format_title: string;
  title_line_2: string;
  title_line_1: string;
  shadow_color: string;
  details_description: string;
  background_left_color: string;
  long_format_title: string;
  poster_fade_color: string;
  secondary_color: string;
  playlist_tile_image: string;
  base_color: string;
  highlight_color: string;
  background_title: string;
  pin_score_requirement?: number;
}

export interface TournamentWindowTemplatePayoutTable {
  scoreId: string;
  scoringType: string;
  ranks: {
    threshold: number;
    payouts: {
      rewardType: string;
      rewardMode: string;
      value: string;
      quantity: number;
    }[];
  }[];
}

export interface TournamentWindowTemplateTiebreakFormula {
  basePointsBits: number;
  components: {
    trackedStat: string;
    bits: number;
    multiplier?: number;
    aggregation: string;
  }[];
}

export interface TournamentWindowTemplateScoringRule {
  trackedStat: string;
  matchRule: string;
  rewardTiers: {
    keyValue: number;
    pointsEarned: number;
    multiplicative: boolean;
  }[];
}

export interface TournamentWindowTemplateData {
  gameId: string;
  eventTemplateId: string;
  playlistId: string;
  matchCap: number;
  liveSessionAttributes: string[];
  scoringRules: TournamentWindowTemplateScoringRule[];
  tiebreakerFormula: TournamentWindowTemplateTiebreakFormula;
  payoutTable: TournamentWindowTemplatePayoutTable[];
}

export interface TournamentWindowResults {
  gameId: string;
  eventId: string;
  eventWindowId: string;
  page: number;
  totalPages: number;
  updatedTime: string;
  entries: {
    gameId: string;
    eventId: string;
    eventWindowId: string;
    teamAccountIds: string[];
    liveSessionId?: string;
    pointsEarned: number;
    score: number;
    rank: number;
    percentile: number;
    pointBreakdown: {
      [statIndex: string]: {
        timesAchieved: number;
        pointsEarned: number;
      };
    };
    sessionHistory: {
      sessionId: string;
      endTime: string;
      trackedStats: {
        PLACEMENT_STAT_INDEX: number;
        TIME_ALIVE_STAT: number;
        TEAM_ELIMS_STAT_INDEX: number;
        MATCH_PLAYED_STAT: number;
        PLACEMENT_TIEBREAKER_STAT: number;
        VICTORY_ROYALE_STAT: number;
      };
    }[];
    tokens: string[];
    teamId: string;
  }[];
  liveSessions: any;
}

export interface BlurlStreamMasterPlaylistData {
  type: 'master';
  language: string;
  url: string;
  data: string;
  duration?: number;
}

export interface BlurlStreamVariantPlaylistData {
  type: 'variant';
  rel_url: string;
  data: string;
}

export interface BlurlStreamData {
  playlists: (BlurlStreamMasterPlaylistData|BlurlStreamVariantPlaylistData)[];
  subtitles: string;
  ucp?: string;
  audioonly?: boolean;
  aspectratio?: string;
  partysync?: boolean;
  lrcs: string;
  duration?: number;
}

export interface CreativeIslandData {
  namespace: string;
  accountId: string;
  creatorName: string;
  mnemonic: string;
  linkType: string;
  metadata: {
    mode: string;
    quicksilver_id: string;
    image_url: string;
    tagline: string;
    islandType: string;
    title: string;
    locale: string;
    matchmaking: {
      selectedJoinInProgressType: number;
      playersPerTeam: number;
      maximumNumberOfPlayers: number;
      override_Playlist: string;
      playerCount: number;
      mmsType: string;
      mmsPrivacy: string;
      numberOfTeams: number;
      bAllowJoinInProgress: boolean;
      minimumNumberOfPlayers: number;
      joinInProgressTeam: number;
    };
    supportCode: string;
    introduction: string;
    generated_image_urls: {
      url_s: string;
      url_m: string;
      compressed: {
        url_s: string;
        url_m: string;
        url: string;
      };
      url: string;
    };
  };
  version: number;
  active: boolean;
  disabled: boolean;
  created: string;
  published: string;
  descriptionTags: string[];
  moderationStatus: string;
}

export interface CreativeDiscoveryPanel {
  PanelName: string;
  Pages: {
    results: {
      linkData: CreativeIslandData;
      isFavorite: boolean;
    }[];
    hasMore: boolean;
  }[];
}
