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
      method: 'GET',
      url: `${Endpoints.BR_NEWS}/savetheworldnews?lang=${language}`,
      headers: {
        'Accept-Language': language,
      },
    }, AuthSessionStoreKey.Fortnite);

    return newsResponse.news.messages.map((m: any) => new STWNewsMessage(this.client, m));
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
