import Base from '../Base';
import TournamentWindow from './TournamentWindow';
import type {
  PlatformMappings, RegionMappings, TournamentData, TournamentDisplayData, TournamentMetadata,
} from '../../resources/httpResponses';
import type {
  FullPlatform, Region, TournamentColors, TournamentImages, TournamentTexts, TournamentWindowTemplate,
} from '../../resources/structs';
import type Client from '../Client';

/**
 * Represents a Fortnite tournament
 */
class Tournament extends Base {
  /**
   * The tournament's ID
   */
  public id: string;

  /**
   * The regions of this tournament
   */
  public regions: Region[];

  /**
   * The region mappings
   */
  public regionMappings: RegionMappings;

  /**
   * The platforms of this tournament
   */
  public platforms: FullPlatform[];

  /**
   * The platform mappings
   */
  public platformMappings: PlatformMappings;

  /**
   * The tournament's display data ID
   */
  public displayDataId: string;

  /**
   * The event group
   */
  public eventGroup: string;

  /**
   * The tournament's announcement time
   */
  public announcementTime: Date;

  /**
   * The tournament's app ID
   */
  public appId?: any;

  /**
   * The environment
   */
  public environment?: any;

  /**
   * The tournament's meta data
   */
  public metadata: TournamentMetadata;

  /**
   * The tournament's start time
   */
  public beginTime: Date;

  /**
   * The tournament's end time
   */
  public endTime: Date;

  /**
   * The tournament's display color data
   */
  public colors: TournamentColors;

  /**
   * The tournament's display image data
   */
  public images: TournamentImages;

  /**
   * The tournament's display text data
   */
  public texts: TournamentTexts;

  /**
   * The tournament's windows
   */
  public windows: TournamentWindow[];

  /**
   * @param client The main client
   * @param tournamentData The tournament data
   * @param tournamentDisplayData The tournament display data
   * @param templates The tournament template
   */
  constructor(
    client: Client,
    tournamentData: TournamentData,
    tournamentDisplayData: TournamentDisplayData,
    templates: TournamentWindowTemplate[],
  ) {
    super(client);

    this.id = tournamentData.eventId;
    this.regions = tournamentData.regions;
    this.regionMappings = tournamentData.regionMappings;
    this.platforms = tournamentData.platforms;
    this.platformMappings = tournamentData.platformMappings;
    this.displayDataId = tournamentData.displayDataId;
    this.eventGroup = tournamentData.eventGroup;
    this.announcementTime = new Date(tournamentData.announcementTime);
    this.appId = tournamentData.appId;
    this.environment = tournamentData.environment;
    this.metadata = tournamentData.metadata;
    this.beginTime = new Date(tournamentData.beginTime);
    this.endTime = new Date(tournamentData.endTime);

    this.colors = {
      titleColor: tournamentDisplayData.title_color,
      backgroundTextColor: tournamentDisplayData.background_text_color,
      backgroundRightColor: tournamentDisplayData.background_right_color,
      backgroundLeftColor: tournamentDisplayData.background_left_color,
      shadowColor: tournamentDisplayData.shadow_color,
      posterFadeColor: tournamentDisplayData.poster_fade_color,
      baseColor: tournamentDisplayData.base_color,
      highlightColor: tournamentDisplayData.highlight_color,
    };

    this.images = {
      loadingScreenImage: tournamentDisplayData.loading_screen_image,
      posterBackImage: tournamentDisplayData.poster_back_image,
      posterFrontImage: tournamentDisplayData.poster_front_image,
      playlistTileImage: tournamentDisplayData.playlist_tile_image,
    };

    this.texts = {
      pinEarnedText: tournamentDisplayData.pin_earned_text,
      pinScoreRequirement: tournamentDisplayData.pin_score_requirement,
      scheduleInfo: tournamentDisplayData.schedule_info,
      flavorDescription: tournamentDisplayData.flavor_description,
      shortFormatTitle: tournamentDisplayData.short_format_title,
      titleLine1: tournamentDisplayData.title_line_1,
      titleLine2: tournamentDisplayData.title_line_2,
      detailsDescription: tournamentDisplayData.details_description,
      longFormatTitle: tournamentDisplayData.long_format_title,
      backgroundTitle: tournamentDisplayData.background_title,
    };

    this.windows = tournamentData.eventWindows
      .map((w) => new TournamentWindow(this, w, templates.find((t) => t.windowId === w.eventWindowId)?.templateData));
  }
}

export default Tournament;
