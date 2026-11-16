import AuthSession from './AuthSession';
import { AuthSessionType } from '../../resources/enums';
import Endpoints from '../../resources/Endpoints';
import type Client from '../Client';
import type { FortniteClientCredentialsAuthData } from '../../resources/structs';

class FortniteClientCredentialsAuthSession extends AuthSession<AuthSessionType.FortniteClientCredentials> {
  public clientsService: string;
  public isInternalClient: boolean;
  public productId: string;
  public applicationId: string;
  public refreshTimeout?: NodeJS.Timeout;
  constructor(client: Client, data: FortniteClientCredentialsAuthData, clientSecret: string) {
    super(client, data, clientSecret, AuthSessionType.FortniteClientCredentials);

    this.clientsService = data.client_service;
    this.isInternalClient = data.internal_client;
    this.productId = data.product_id;
    this.applicationId = data.application_id;
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
    } catch {
      return false;
    }
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
    const lifecycle = this.client.auth.lifecycle;
    this.refreshLock.lock();

    try {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = undefined;

      const response = await this.client.http.epicgamesRequest<FortniteClientCredentialsAuthData>({
        method: 'POST',
        url: Endpoints.OAUTH_TOKEN_CREATE,
        headers: {
          Authorization: `basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        data: new URLSearchParams({
          grant_type: 'client_credentials',
          token_type: 'eg1',
        }).toString(),
      });
      if (lifecycle !== this.client.auth.lifecycle) throw new Error('Authentication refresh cancelled');

      this.accessToken = response.access_token;
      this.expiresAt = new Date(response.expires_at);

      this.initRefreshTimeout();
    } finally {
      this.refreshLock.unlock();
    }
  }

  public initRefreshTimeout() {
    clearTimeout(this.refreshTimeout);
    this.refreshTimeout = setTimeout(() => {
      this.refresh().catch(() => {
        this.client.debug('[AUTH] Scheduled Fortnite client credentials session refresh failed');
      });
    }, this.expiresAt.getTime() - Date.now() - 15 * 60 * 1000);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the public input contract.
  public static async create(client: Client, clientId: string, clientSecret: string, data: any) {
    const lifecycle = client.auth.lifecycle;
    const response = await client.http.epicgamesRequest<FortniteClientCredentialsAuthData>({
      method: 'POST',
      url: Endpoints.OAUTH_TOKEN_CREATE,
      headers: {
        Authorization: `basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams(data).toString(),
    });
    if (lifecycle !== client.auth.lifecycle) throw new Error('Authentication session creation cancelled');

    const session = new FortniteClientCredentialsAuthSession(client, response, clientSecret);
    session.initRefreshTimeout();

    return session;
  }
}

export default FortniteClientCredentialsAuthSession;
