import type {
  TournamentWindowBlackoutPeriod, TournamentWindowData, TournamentWindowMetadata, TournamentWindowScoreLocation,
  TournamentWindowTemplateData, TournamentWindowTemplatePayoutTable, TournamentWindowTemplateScoringRule,
  TournamentWindowTemplateTiebreakFormula,
} from '../../resources/httpResponses';
import type Tournament from './Tournament';

/**
 * Represents a Fortnite tournament window
 */
class TournamentWindow {
  /**
   * The tournament this window belongs to
   */
  public tournament!: Tournament;

  /**
   * The tournament window ID
   */
  public id: string;

  /**
   * The count down begin date
   */
  public countdownBeginTime: Date;

  /**
   * The tournament windows's begin time
   */
  public beginTime: Date;

  /**
   * The tournament windows's end time
   */
  public endTime: Date;

  /**
   * The blackout periods
   */
  public blackoutPeriods: TournamentWindowBlackoutPeriod[];

  /**
   * The round number
   */
  public round: number;

  /**
   * The payout delay
   */
  public payoutDelay: number;

  /**
   * Whether this tournament window is TBD
   */
  public isTBD: boolean;

  /**
   * Whether live spectating is enabled for this tournament window
   */
  public canLiveSpectate: boolean;

  /**
   * The score locations
   */
  public scoreLocations: TournamentWindowScoreLocation[];

  /**
   * The tournament window's visibility
   */
  public visibility: string;

  /**
   * All required tokens to participate in this tournament window
   */
  public requireAllTokens: string[];

  /**
   * Any tokens required to participate in this tournament window
   */
  public requireAnyTokens: string[];

  /**
   * requireNoneTokensCaller
   */
  public requireNoneTokensCaller: string[];

  /**
   * requireAllTokensCaller
   */
  public requireAllTokensCaller: any[];

  /**
   * requireAnyTokensCaller
   */
  public requireAnyTokensCaller: any[];

  /**
   * Additional requirements to participate in this tournament window
   */
  public additionalRequirements: string[];

  /**
   * The team mate eligibility
   */
  public teammateEligibility: string;

  /**
   * The tournament window's meta data
   */
  public metadata: TournamentWindowMetadata;

  /**
   * The tournament windows's playlist id
   */
  public playlistId?: string;

  /**
   * The tournament window's match cap
   */
  public matchCap?: number;

  /**
   * The tournament windows's live session attributes
   */
  public liveSessionAttributes?: string[];

  /**
   * The tournament windows's scoring rules
   */
  public scoringRules?: TournamentWindowTemplateScoringRule[];

  /**
   * The tournament window's tiebreaker formula
   */
  public tiebreakerFormula?: TournamentWindowTemplateTiebreakFormula;

  /**
   * The tournament window's payout table
   */
  public payoutTable?: TournamentWindowTemplatePayoutTable[];

  /**
   * @param tournament The tournament this window belongs to
   * @param windowData The tournament window's data
   * @param tournamentWindowTemplateData The tournament window's template data
   */
  constructor(tournament: Tournament, windowData: TournamentWindowData, tournamentWindowTemplateData?: TournamentWindowTemplateData) {
    Object.defineProperty(this, 'tournament', { value: tournament });

    // Window data
    this.id = windowData.eventWindowId;
    this.countdownBeginTime = new Date(windowData.countdownBeginTime);
    this.beginTime = new Date(windowData.beginTime);
    this.endTime = new Date(windowData.endTime);
    this.blackoutPeriods = windowData.blackoutPeriods;
    this.round = windowData.round;
    this.payoutDelay = windowData.payoutDelay;
    this.isTBD = windowData.isTBD;
    this.canLiveSpectate = windowData.canLiveSpectate;
    this.scoreLocations = windowData.scoreLocations;
    this.visibility = windowData.visibility;
    this.requireAllTokens = windowData.requireAllTokens;
    this.requireAnyTokens = windowData.requireAnyTokens;
    this.requireNoneTokensCaller = windowData.requireNoneTokensCaller;
    this.requireAllTokensCaller = windowData.requireAllTokensCaller;
    this.requireAnyTokensCaller = windowData.requireAnyTokensCaller;
    this.additionalRequirements = windowData.additionalRequirements;
    this.teammateEligibility = windowData.teammateEligibility;
    this.metadata = windowData.metadata;

    // Template data
    this.playlistId = tournamentWindowTemplateData?.playlistId;
    this.matchCap = tournamentWindowTemplateData?.matchCap;
    this.liveSessionAttributes = tournamentWindowTemplateData?.liveSessionAttributes;
    this.scoringRules = tournamentWindowTemplateData?.scoringRules;
    this.tiebreakerFormula = tournamentWindowTemplateData?.tiebreakerFormula;
    this.payoutTable = tournamentWindowTemplateData?.payoutTable;
  }

  /**
   * Fetches the results for this tournament window
   * @param page The results page index
   * @param showLiveSessions Whether to show live sessions
   */
  public async getResults(page = 0, showLiveSessions = false) {
    return this.tournament.client.tournaments.getWindowResults(this.tournament.id, this.id, showLiveSessions, page);
  }
}

export default TournamentWindow;
