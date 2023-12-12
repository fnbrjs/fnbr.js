import { AxiosError } from 'axios';
import Endpoints from '../../resources/Endpoints';
import Base from '../Base';
import MatchNotFoundError from '../exceptions/MatchNotFoundError';
import EventTokens from '../structures/EventTokens';
import Tournament from '../structures/Tournament';
import { AuthSessionStoreKey } from '../../resources/enums';
import type { ResponseType } from 'axios';
import type {
  FullPlatform, Region, TournamentSessionMetadata, TournamentWindowTemplate,
} from '../../resources/structs';
import type {
  TournamentData, TournamentDisplayData, TournamentWindowResults, TournamentWindowTemplateData,
} from '../../resources/httpResponses';

/**
 * Represent's the client's tournament manager.
 */
class TournamentManager extends Base {
  /**
   * Downloads a file from the CDN (used for replays)
   * @param url The URL of the file to download
   * @param responseType The response type
   */
  private async downloadReplayCDNFile(url: string, responseType: ResponseType) {
    const fileLocationInfo = await this.client.http.epicgamesRequest({
      method: 'GET',
      url,
    }, AuthSessionStoreKey.Fortnite);

    const file = await this.client.http.request({
      method: 'GET',
      url: (Object.values(fileLocationInfo.files)[0] as any).readLink,
      responseType,
    });

    return file;
  }

  /**
   * Fetches the event tokens for an account.
   * This can be used to check if a user is eligible to play a certain tournament window
   * or to check a user's arena division in any season
   * @param user The id(s) or display name(s) of the user(s)
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async getEventTokens(user: string | string[]): Promise<EventTokens[]> {
    const users = typeof user === 'string' ? [user] : user;

    const resolvedUsers = await this.client.user.fetchMultiple(users);

    const userChunks: string[][] = resolvedUsers.map((u) => u.id).reduce((resArr: any[], usr, i) => {
      const chunkIndex = Math.floor(i / 16);
      // eslint-disable-next-line no-param-reassign
      if (!resArr[chunkIndex]) resArr[chunkIndex] = [];
      resArr[chunkIndex].push(usr);
      return resArr;
    }, []);

    const statsResponses = await Promise.all(userChunks.map((c) => this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_TOURNAMENT_TOKENS}?teamAccountIds=${c.join(',')}`,
    }, AuthSessionStoreKey.Fortnite)));

    return statsResponses.map((r) => r.accounts).flat(1)
      .map((r) => new EventTokens(this.client, r.tokens, resolvedUsers.find((u) => u.id === r.accountId)!));
  }

  /**
   * Fetches the current and past Battle Royale tournaments
   * @param region The region
   * @param platform The platform
   * @throws {EpicgamesAPIError}
   */
  public async get(region: Region = 'EU', platform: FullPlatform = 'Windows') {
    const [tournaments, tournamentsInfo] = await Promise.all([
      this.client.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.BR_TOURNAMENTS_DOWNLOAD}/${this.client.user.self!.id}?region=${region}`
          + `&platform=${platform}&teamAccountIds=${this.client.user.self!.id}`,
      }, AuthSessionStoreKey.Fortnite),
      this.client.http.epicgamesRequest({
        method: 'GET',
        url: `${Endpoints.BR_NEWS}/tournamentinformation`,
      }, AuthSessionStoreKey.Fortnite),
    ]);

    const constuctedTournaments: Tournament[] = [];

    tournaments.events.forEach((t: TournamentData) => {
      let tournamentDisplayData = tournamentsInfo.tournament_info?.tournaments
        ?.find((td: TournamentDisplayData) => td.tournament_display_id === t.displayDataId);

      if (!tournamentDisplayData) {
        tournamentDisplayData = (Object.values(tournamentsInfo) as any[])
          .find((tdr: any) => tdr.tournament_info?.tournament_display_id === t.displayDataId)?.tournament_info;
      }

      if (!tournamentDisplayData) {
        return;
      }

      const templates: TournamentWindowTemplate[] = [];

      t.eventWindows.forEach((w) => {
        const template = tournaments.templates
          .find((tt: TournamentWindowTemplateData) => tt.eventTemplateId === w.eventTemplateId);
        if (template) templates.push({ windowId: w.eventWindowId, templateData: template });
      });

      constuctedTournaments.push(new Tournament(this.client, t, tournamentDisplayData, templates));
    });

    return constuctedTournaments;
  }

  public async getData() {
    const tournaments = await this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_TOURNAMENTS}/${this.client.user.self!.id}`,
    }, AuthSessionStoreKey.Fortnite);

    const tournamentsInfo = await this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_NEWS}/tournamentinformation`,
    }, AuthSessionStoreKey.Fortnite);

    const constuctedTournaments: Tournament[] = [];

    tournaments.events.forEach((t: TournamentData) => {
      let tournamentDisplayData = tournamentsInfo.tournament_info?.tournaments
        ?.find((td: TournamentDisplayData) => td.tournament_display_id === t.displayDataId);

      if (!tournamentDisplayData) {
        tournamentDisplayData = (Object.values(tournamentsInfo) as any[])
          .find((tdr: any) => tdr.tournament_info?.tournament_display_id === t.displayDataId)?.tournament_info;
      }

      if (!tournamentDisplayData) {
        return;
      }

      const templates: TournamentWindowTemplate[] = [];

      t.eventWindows.forEach((w) => {
        const template = tournaments.templates
          .find((tt: TournamentWindowTemplateData) => tt.eventTemplateId === w.eventTemplateId);
        if (template) templates.push({ windowId: w.eventWindowId, templateData: template });
      });

      constuctedTournaments.push(new Tournament(this.client, t, tournamentDisplayData, templates));
    });

    return constuctedTournaments;
  }

  /**
   * Fetches a tournament session's metadata
   * @param sessionId The session ID
   * @throws {MatchNotFoundError} The match wasn't found
   * @throws {EpicgamesAPIError}
   * @throws {AxiosError}
   */
  public async getSessionMetadata(sessionId: string): Promise<TournamentSessionMetadata> {
    let replayMetadataResponse;
    try {
      replayMetadataResponse = await this.downloadReplayCDNFile(`${Endpoints.BR_REPLAY_METADATA}%2F${sessionId}.json`, 'json');
    } catch (e) {
      if (e instanceof AxiosError && typeof e.response?.data === 'string'
        && e.response?.data.includes('<Message>The specified key does not exist.</Message>')) {
        throw new MatchNotFoundError(sessionId);
      }

      throw e;
    }

    return {
      changelist: replayMetadataResponse.Changelist,
      checkpoints: replayMetadataResponse.Checkpoints,
      dataChunks: replayMetadataResponse.DataChunks,
      desiredDelayInSeconds: replayMetadataResponse.DesiredDelayInSeconds,
      events: replayMetadataResponse.Events,
      friendlyName: replayMetadataResponse.FriendlyName,
      lengthInMS: replayMetadataResponse.LengthInMS,
      networkVersion: replayMetadataResponse.NetworkVersion,
      replayName: replayMetadataResponse.ReplayName,
      timestamp: new Date(replayMetadataResponse.Timestamp),
      isCompressed: replayMetadataResponse.bCompressed,
      isLive: replayMetadataResponse.bIsLive,
    };
  }

  /**
   * Fetches the results for a tournament window
   * @param eventId The tournament's ID
   * @param eventWindowId The tournament window's ID
   * @param showLiveSessions Whether to show live sessions
   * @param page The results page index
   * @throws {EpicgamesAPIError}
   */
  public async getWindowResults(
    eventId: string,
    eventWindowId: string,
    showLiveSessions = false,
    page = 0,
  ): Promise<TournamentWindowResults> {
    const window = await this.client.http.epicgamesRequest({
      method: 'GET',
      url: `${Endpoints.BR_TOURNAMENT_WINDOW}/${eventId}/${eventWindowId}/`
        + `${this.client.user.self!.id}?page=${page}&rank=0&teamAccountIds=&appId=Fortnite&showLiveSessions=${showLiveSessions}`,
    }, AuthSessionStoreKey.Fortnite);

    return window;
  }
}

export default TournamentManager;
