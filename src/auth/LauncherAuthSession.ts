import AuthSession from './AuthSession';
import { AuthSessionType } from '../../resources/enums';
import Endpoints from '../../resources/Endpoints';
import type Client from '../Client';
import type { LauncherAuthData } from '../../resources/structs';

class LauncherAuthSession extends AuthSession<AuthSessionType.Launcher> {
  public app: string;
  public clientsService: string;
  public displayName: string;
  public isInternalClient: boolean;
  public inAppId: string;
  public scope: string[];
  public refreshToken: string;
  public refreshTokenExpiresAt: Date;
  public refreshTimeout?: NodeJS.Timeout;
  constructor(client: Client, data: LauncherAuthData, clientSecret: string) {
    super(client, data, clientSecret, AuthSessionType.Launcher);

    this.app = data.app;
    this.clientsService = data.client_service;
    this.displayName = data.displayName;
    this.isInternalClient = data.internal_client;
    this.inAppId = data.in_app_id;
    this.scope = data.scope;
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

      const response = await this.client.http.epicgamesRequest<LauncherAuthData>({
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

      this.client.emit('refreshtoken:created', {
        accountId: this.accountId,
        clientId: this.clientId,
        displayName: this.displayName,
        expiresAt: this.refreshTokenExpiresAt.toISOString(),
        expiresIn: this.refreshTokenExpiresAt.getTime() - Date.now(),
        token: this.refreshToken,
      });

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
    const response = await client.http.epicgamesRequest<LauncherAuthData>({
      method: 'POST',
      url: Endpoints.OAUTH_TOKEN_CREATE,
      headers: {
        Authorization: `basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams(data).toString(),
    });

    const session = new LauncherAuthSession(client, response, clientSecret);
    session.initRefreshTimeout();

    client.emit('refreshtoken:created', {
      accountId: session.accountId,
      clientId: session.clientId,
      displayName: session.displayName,
      expiresAt: session.refreshTokenExpiresAt.toISOString(),
      expiresIn: Math.round((session.refreshTokenExpiresAt.getTime() - Date.now()) / 1000),
      token: session.refreshToken,
    });

    return session;
  }
}

export default LauncherAuthSession;
