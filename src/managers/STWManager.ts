import Base from '../Base';
import UserNotFoundError from '../exceptions/UserNotFoundError';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey } from '../../resources/enums';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import STWProfile from '../structures/stw/STWProfile';
import STWNewsMessage from '../structures/stw/STWNewsMessage';
import type { STWWorldInfoData } from '../../resources/structs';

/**
 * Represents the client's STW manager
 */
class STWManager extends Base {
  /**
   * Fetches the Save The World profile for a players
   * @param user The id or display name of the user
   * @throws {UserNotFoundError} The user wasn't found
   * @throws {EpicgamesAPIError}
   */
  public async getProfile(user: string) {
    const resolvedUser = await this.client.user.fetch(user);
    if (!resolvedUser) throw new UserNotFoundError(user);

    let queryProfileResponse;
    try {
      queryProfileResponse = await this.client.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.MCP}/${resolvedUser.id}/public/QueryPublicProfile?profileId=campaign`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: {},
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.modules.profiles.profile_not_found') {
        throw new UserNotFoundError(user);
      }

      throw e;
    }

    return new STWProfile(this.client, queryProfileResponse.profileChanges[0].profile, resolvedUser);
  }

  /**
   * Fetches the current Save The World news
   * @param language The language of the news
   * @throws {EpicgamesAPIError}
   */
  public async getNews(language = this.client.config.language): Promise<STWNewsMessage[]> {
    const newsResponse = await this.client.http.epicgamesRequest({
      method: 'POST',
      url: Endpoints.STW_NEWS_MOTD,
      data: {
        accountLevel: 0,
        alienArtifacts: 0,
        battlepass: false,
        battlepassItemsClaimed: 0,
        battlepassLevel: 1,
        battlepassStars: 0,
        completedQuests: [],
        countOfDragonBalls: 0,
        country: 'DE',
        dateLastPlayed: '1901-12-13T20:45:52.000Z',
        dateLastPlayedArena: '1901-12-13T20:45:52.000Z',
        dateLastPlayedSaveTheWorld: '2022-11-01T23:25:31.000Z',
        dateLastPlayedTournament: '1901-12-13T20:45:52.000Z',
        daysSinceLastSession: 44153.14098048611,
        globalCash: 0,
        isRestricted: true,
        language,
        lifetimeWins: 0,
        onLogin: true,
        ownsSaveTheWorld: true,
        platform: 'Windows',
        progressiveBackblingStage: 0,
        seasonHoursPlayed: 0,
        serverRegion: 'EU',
        socialTags: [],
        stylePoints: 0,
        subscription: false,
        totalHoursPlayed: 0,
        unlockedPages: 1,
      },
      headers: {
        'Accept-Language': language,
      },
    }, AuthSessionStoreKey.Fortnite);

    return newsResponse?.contentItems.map((m: any) => new STWNewsMessage(this.client, m));
  }

  /**
   * Fetches the current Save The World world info
   * @param language The language of the world info
   * @throws {EpicgamesAPIError}
   */
  public async getWorldInfo(language = this.client.config.language): Promise<STWWorldInfoData> {
    const worldInfoResponse = await this.client.http.epicgamesRequest({
      method: 'GET',
      url: Endpoints.STW_WORLD_INFO,
      headers: {
        'Accept-Language': language,
      },
    }, AuthSessionStoreKey.Fortnite);

    return {
      theaters: worldInfoResponse.theaters,
      missions: worldInfoResponse.missions,
      missionAlerts: worldInfoResponse.missionAlerts,
    };
  }
}

export default STWManager;
