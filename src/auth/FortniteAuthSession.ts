import AuthSession from './AuthSession';
import { AuthSessionType } from '../../resources/enums';
import Endpoints from '../../resources/Endpoints';
import type Client from '../Client';
import type { FortniteAuthData } from '../../resources/structs';

/**
 * Represents an auth session
 */
class FortniteAuthSession extends AuthSession<AuthSessionType.Fortnite> {
  /**
   * The app name
   */
  public app: string;

  /**
   * The clients service
   */
  public clientsService: string;

  /**
   * The account's display name
   */
  public displayName: string;

  /**
   * Whether the client is internal
   */
  public isInternalClient: boolean;

  /**
   * The account's in-app id
   */
  public inAppId: string;

  /**
   * The device id
   */
  public deviceId: string;

  /**
   * The refresh token
   */
  public refreshToken: string;

  /**
   * The time when the refresh token expires
   */
  public refreshTokenExpiresAt: Date;

  /**
   * The refresh timeout
   */
  public refreshTimeout?: NodeJS.Timeout;
  constructor(client: Client, data: FortniteAuthData, clientSecret: string) {
    super(client, data, clientSecret, AuthSessionType.Fortnite);

    this.app = data.app;
    this.clientsService = data.client_service;
    this.displayName = data.displayName;
    this.isInternalClient = data.internal_client;
    this.inAppId = data.in_app_id;
    this.deviceId = data.device_id;
    this.refreshToken = data.refresh_token;
    this.refreshTokenExpiresAt = new Date(data.refresh_expires_at);
  }

  public async verify(forceVerify = false) {
    if (!forceVerify && this.isExpired) {
      return false;
    }

    try {
      await this.client.http.epicgamesRequest({
        url: Endpoints.OAUTH_TOKEN_VERIFY,
        headers: {
          Authorization: `bearer ${this.accessToken}`,
        },
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  public async createExchangeCode(): Promise<string> {
    const response = await this.client.http.epicgamesRequest({
      url: Endpoints.OAUTH_EXCHANGE,
      headers: {
        Authorization: `bearer ${this.accessToken}`,
      },
    });

    return response.code;
  }

  public async revoke() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = undefined;

    await this.client.http.epicgamesRequest({
      method: 'DELETE',
      url: `${Endpoints.OAUTH_TOKEN_KILL}/${this.accessToken}`,
      headers: {
        Authorization: `bearer ${this.accessToken}`,
      },
    });
  }

  public async refresh() {
    this.refreshLock.lock();

    try {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = undefined;

      const response = await this.client.http.epicgamesRequest<FortniteAuthData>({
        method: 'POST',
        url: Endpoints.OAUTH_TOKEN_CREATE,
        headers: {
          Authorization: `basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          token_type: 'eg1',
        }).toString(),
      });

      this.accessToken = response.access_token;
      this.expiresAt = new Date(response.expires_at);
      this.refreshToken = response.refresh_token;
      this.refreshTokenExpiresAt = new Date(response.refresh_expires_at);

      this.initRefreshTimeout();
    } finally {
      this.refreshLock.unlock();
    }
  }

  public initRefreshTimeout() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => this.refresh(), this.expiresAt.getTime() - Date.now() - 15 * 60 * 1000);
  }

  public static async create(client: Client, clientId: string, clientSecret: string, data: any) {
    const response = await client.http.epicgamesRequest<FortniteAuthData>({
      method: 'POST',
      url: Endpoints.OAUTH_TOKEN_CREATE,
      headers: {
        Authorization: `basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams(data).toString(),
    });

    const session = new FortniteAuthSession(client, response, clientSecret);
    session.initRefreshTimeout();

    return session;
  }
}

export default FortniteAuthSession;
