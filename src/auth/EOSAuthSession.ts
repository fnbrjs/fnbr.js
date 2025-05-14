import { URLSearchParams } from 'url';
import AuthSession from './AuthSession';
import { AuthSessionType } from '../../resources/enums';
import Endpoints from '../../resources/Endpoints';
import type Client from '../Client';
import type { EOSAuthData, EOSTokenInfo } from '../../resources/structs';

class EOSAuthSession extends AuthSession<AuthSessionType.EOS> {
  public refreshToken: string;
  public refreshTokenExpiresAt: Date;
  public applicationId: string;
  public mergedAccounts: string[];
  public scope: string;

  public refreshTimeout?: NodeJS.Timeout;

  constructor(client: Client, data: EOSAuthData, clientSecret: string) {
    super(client, data, clientSecret, AuthSessionType.EOS);

    this.applicationId = data.application_id;
    this.mergedAccounts = data.merged_accounts;
    this.scope = data.scope;
    this.refreshToken = data.refresh_token;
    this.refreshTokenExpiresAt = new Date(data.refresh_expires_at);
  }

  public async verify(forceVerify = false) {
    if (!forceVerify && this.isExpired) {
      return false;
    }

    const tokenInfo = await this.client.http.epicgamesRequest<EOSTokenInfo>({
      method: 'POST',
      url: Endpoints.EOS_TOKEN_INFO,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        token: this.accessToken,
      }).toString(),
    });

    return tokenInfo.active === true;
  }

  public async revoke() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = undefined;

    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: Endpoints.EOS_TOKEN_REVOKE,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        token: this.accessToken,
      }).toString(),
    });
  }

  public async refresh() {
    this.refreshLock.lock();

    try {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = undefined;

      const response = await this.client.http.epicgamesRequest<EOSAuthData>({
        method: 'POST',
        url: Endpoints.EOS_TOKEN,
        headers: {
          Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
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

  public static async create(client: Client, clientId: string, clientSecret: string, data: Record<string, string>) {
    const response = await client.http.epicgamesRequest<EOSAuthData>({
      method: 'POST',
      url: Endpoints.EOS_TOKEN,
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams(data).toString(),
    });

    const session = new EOSAuthSession(client, response, clientSecret);
    session.initRefreshTimeout();

    return session;
  }
}

export default EOSAuthSession;
