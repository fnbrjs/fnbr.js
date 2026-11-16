import axios from 'axios';
import { Collection } from '@discordjs/collection';
import { promises as fs } from 'fs';
import { URL } from 'url';
import Base from '../Base';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey } from '../../resources/enums';
import FortniteAuthSession from './FortniteAuthSession';
import LauncherAuthSession from './LauncherAuthSession';
import AuthClients from '../../resources/AuthClients';
import { resolveAuthObject, resolveAuthString } from '../util/Util';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import FortniteClientCredentialsAuthSession from './FortniteClientCredentialsAuthSession';
import EOSAuthSession from './EOSAuthSession';
import type {
  AuthClient, AuthStringResolveable, DeviceAuthResolveable,
  DeviceAuthWithSnakeCaseSupport, AuthSessionStore,
} from '../../resources/structs';
import type Client from '../Client';
import type AuthSession from './AuthSession';
import type { AuthSessionType } from '../../resources/enums';

type AuthSessionStoreType = AuthSessionStore<AuthSessionStoreKey,
  FortniteAuthSession
  | LauncherAuthSession
  | FortniteClientCredentialsAuthSession
  | EOSAuthSession>;

/**
 * Represents the client's authentication manager
 * @private
 */
class Auth extends Base {
  /**
   * The client's auth sessions
   */
  public sessions: AuthSessionStoreType;

  /** Invalidates authentication recovery when login or logout supersedes it. */
  public lifecycle = 0;

  private recovery?: Promise<void>;

  public clearRefreshTimeouts() {
    for (const session of this.sessions.values()) {
      clearTimeout(session.refreshTimeout);
      session.refreshTimeout = undefined;
    }
  }

  /** Restarts an established client once after a confirmed invalid refresh token. */
  public async handleRefreshFailure(session: AuthSession<AuthSessionType>, error: unknown): Promise<void> {
    const invalidRefresh = error instanceof EpicgamesAPIError
      && error.code === 'errors.com.epicgames.account.auth_token.invalid_refresh_token'
      && (error.httpStatus === 400 || error.httpStatus === 401);
    const invalidGrant = axios.isAxiosError<{ error?: string }>(error)
      && error.response?.status === 400 && error.response.data?.error === 'invalid_grant';
    if (!invalidRefresh && !invalidGrant) return;
    if (!this.sessions.some((current) => current === session)) return;
    if (!this.client.config.restartOnInvalidRefresh || !this.client.isReady) return;
    if (this.recovery) {
      await this.recovery;
      return;
    }

    const recovery = this.restartAfterInvalidRefresh().finally(() => {
      if (this.recovery === recovery) this.recovery = undefined;
    });
    this.recovery = recovery;
    await recovery;
  }

  private async restartAfterInvalidRefresh() {
    this.client.debug('[AUTH] Refresh token invalid; restarting with configured credentials');
    const logout = this.client.logout();
    let lifecycle = this.lifecycle;
    try {
      await logout;
    } catch {
      this.client.debug('[AUTH] Token revocation failed during authentication restart');
    }
    if (lifecycle !== this.lifecycle) return;

    this.sessions.clear();
    const login = this.client.login();
    lifecycle = this.lifecycle;
    try {
      await login;
    } catch {
      if (lifecycle !== this.lifecycle) return;
      this.client.debug('[AUTH] Authentication restart failed; disconnecting');
      try {
        await this.client.logout();
      } catch {
        this.client.debug('[AUTH] Token revocation failed after authentication restart');
      }
    }
  }

  private ensureActive(lifecycle: number, session?: { refreshTimeout?: NodeJS.Timeout }) {
    if (lifecycle === this.lifecycle) return;
    clearTimeout(session?.refreshTimeout);
    if (session) session.refreshTimeout = undefined;
    throw new Error('Authentication cancelled');
  }

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.sessions = new Collection() as AuthSessionStoreType;
  }

  /**
   * Authenticates the client against EpicGames' API
   */
  public async authenticate() {
    const lifecycle = this.lifecycle;
    this.client.debug('[AUTH] Authenticating...');
    const authStartTime = Date.now();

    const authClient = this.client.config.auth.authClient!;
    const authCreds = this.client.config.auth;

    if (authCreds.launcherRefreshToken) {
      await this.launcherRefreshTokenAuthenticate(authCreds.launcherRefreshToken, authClient);
    } else if (authCreds.deviceAuth) {
      await this.deviceAuthAuthenticate(authCreds.deviceAuth, authClient);
    } else if (authCreds.refreshToken) {
      await this.refreshTokenAuthenticate(authCreds.refreshToken, authClient);
    } else if (authCreds.exchangeCode) {
      await this.exchangeCodeAuthenticate(authCreds.exchangeCode, authClient);
    } else if (authCreds.authorizationCode) {
      await this.authorizationCodeAuthenticate(authCreds.authorizationCode, authClient);
    } else {
      throw new Error('No valid auth method found! Please provide one in the client config');
    }
    this.ensureActive(lifecycle);

    if ((!authCreds.launcherRefreshToken && this.client.listenerCount('refreshtoken:created') > 0)
      || (authCreds.createLauncherSession && !this.sessions.has(AuthSessionStoreKey.Launcher))) {
      const exchangeCode = await this.sessions.get(AuthSessionStoreKey.Fortnite)!.createExchangeCode();
      this.ensureActive(lifecycle);

      const launcherSession = await LauncherAuthSession.create(
        this.client,
        AuthClients.launcherAppClient2.clientId,
        AuthClients.launcherAppClient2.secret,
        {
          grant_type: 'exchange_code',
          exchange_code: exchangeCode,
          token_type: 'eg1',
        },
      );
      this.ensureActive(lifecycle, launcherSession);

      this.sessions.set(AuthSessionStoreKey.Launcher, launcherSession);
    }

    if (this.client.config.auth.killOtherTokens) {
      await this.client.http.epicgamesRequest({
        method: 'DELETE',
        url: `${Endpoints.OAUTH_TOKEN_KILL_MULTIPLE}?killType=OTHERS_ACCOUNT_CLIENT_SERVICE`,
      }, AuthSessionStoreKey.Fortnite);
      this.ensureActive(lifecycle);
    }

    if (this.client.config.auth.checkEULA) {
      const eulaCheck = await this.acceptEULA();
      this.ensureActive(lifecycle);
      if (!eulaCheck.alreadyAccepted) this.client.debug('[AUTH] Successfully accepted the EULA');
    }

    if (!authCreds.deviceAuth && this.client.listenerCount('deviceauth:created') > 0) {
      const deviceauth = await this.createDeviceAuth();
      this.ensureActive(lifecycle);

      const deviceAuth = {
        accountId: deviceauth.accountId,
        deviceId: deviceauth.deviceId,
        secret: deviceauth.secret,
      };

      this.client.emit('deviceauth:created', deviceAuth);
    }

    const fortniteClientCredsSession = await FortniteClientCredentialsAuthSession.create(
      this.client,
      AuthClients[authClient].clientId,
      AuthClients[authClient].secret,
      {
        grant_type: 'client_credentials',
        token_type: 'eg1',
      },
    );
    this.ensureActive(lifecycle, fortniteClientCredsSession);

    this.sessions.set(AuthSessionStoreKey.FortniteClientCredentials, fortniteClientCredsSession);

    // Only create an EOS token if we connect to STOMP
    if (this.client.config.connectToSTOMP) {
      await this.fortniteEOSAuthenticate();
    }

    this.client.debug(`[AUTH] Authentification successful (${((Date.now() - authStartTime) / 1000).toFixed(2)}s)`);
  }

  /**
   * Kills all active auth sessions
   */
  public async revokeAllTokens() {
    await Promise.all([...this.sessions.filter((s, k) => k !== AuthSessionStoreKey.Launcher).values()].map((s) => s.revoke()));
  }

  /**
   * Accepts the Fortnite End User License Agreement (EULA)
   */
  private async acceptEULA() {
    const { accountId } = (this.sessions.get(AuthSessionStoreKey.Fortnite)!);

    try {
      await this.client.http.epicgamesRequest({
        method: 'POST',
        url: `${Endpoints.INIT_REQUESTACCESS}/${accountId}`,
        data: {},
      }, AuthSessionStoreKey.Fortnite);
    } catch (e) {
      if (!(e instanceof EpicgamesAPIError && e.code === 'errors.com.epicgames.bad_request')) throw e;
    }

    const EULAdata = await this.client.http.epicgamesRequest({
      url: `${Endpoints.INIT_EULA}/account/${accountId}`,
    }, AuthSessionStoreKey.Fortnite);

    if (!EULAdata) return { alreadyAccepted: true };

    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.INIT_EULA}/version/${EULAdata.version}/account/${accountId}/accept?locale=${EULAdata.locale}`,
    }, AuthSessionStoreKey.Fortnite);

    return { alreadyAccepted: false };
  }

  /**
   * Creates a device auth
   */
  private async createDeviceAuth() {
    return this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.OAUTH_DEVICE_AUTH}/${this.sessions.get(AuthSessionStoreKey.Fortnite)?.accountId}/deviceAuth`,
    }, AuthSessionStoreKey.Fortnite);
  }

  /**
   * Authentication via a device auth
   * @param deviceAuthResolvable A resolvable device auth
   */
  private async deviceAuthAuthenticate(deviceAuthResolvable: DeviceAuthResolveable, authClient: AuthClient) {
    const lifecycle = this.lifecycle;
    const deviceAuth: DeviceAuthWithSnakeCaseSupport = await resolveAuthObject(deviceAuthResolvable);
    this.ensureActive(lifecycle);

    const fortniteSession = await FortniteAuthSession.create(this.client, AuthClients[authClient].clientId, AuthClients[authClient].secret, {
      grant_type: 'device_auth',
      device_id: deviceAuth.deviceId ?? deviceAuth.device_id,
      account_id: deviceAuth.accountId ?? deviceAuth.account_id,
      secret: deviceAuth.secret,
      token_type: 'eg1',
    });
    this.ensureActive(lifecycle, fortniteSession);

    this.sessions.set(AuthSessionStoreKey.Fortnite, fortniteSession);
  }

  /**
   * Authentication via an exchange code
   * @param exchangeCodeResolvable A resolvable exchange code
   */
  private async exchangeCodeAuthenticate(exchangeCodeResolvable: AuthStringResolveable, authClient: AuthClient) {
    const lifecycle = this.lifecycle;
    const exchangeCode = await resolveAuthString(exchangeCodeResolvable);
    this.ensureActive(lifecycle);

    const fortniteSession = await FortniteAuthSession.create(this.client, AuthClients[authClient].clientId, AuthClients[authClient].secret, {
      grant_type: 'exchange_code',
      exchange_code: exchangeCode,
      token_type: 'eg1',
    });
    this.ensureActive(lifecycle, fortniteSession);

    this.sessions.set(AuthSessionStoreKey.Fortnite, fortniteSession);
  }

  /**
   * Authentication via an authorization code
   * @param authorizationCodeResolvable A resolvable authorization code
   */
  private async authorizationCodeAuthenticate(authorizationCodeResolvable: AuthStringResolveable, authClient: AuthClient) {
    const lifecycle = this.lifecycle;
    let authorizationCode: string | undefined;

    switch (typeof authorizationCodeResolvable) {
      case 'function':
        authorizationCode = await authorizationCodeResolvable();
        break;
      case 'string':
        if (authorizationCodeResolvable.length === 32) {
          authorizationCode = authorizationCodeResolvable;
        } else if (authorizationCodeResolvable.includes('?code=')) {
          const url = new URL(authorizationCodeResolvable);
          authorizationCode = url.searchParams.get('code') ?? undefined;
        } else {
          authorizationCode = (await fs.readFile(authorizationCodeResolvable)).toString();
        }
        break;
      default:
        throw new TypeError(`The type "${typeof authorizationCodeResolvable}" does not resolve to a valid auth string`);
    }
    this.ensureActive(lifecycle);

    const fortniteSession = await FortniteAuthSession.create(this.client, AuthClients[authClient].clientId, AuthClients[authClient].secret, {
      grant_type: 'authorization_code',
      code: authorizationCode,
      token_type: 'eg1',
    });
    this.ensureActive(lifecycle, fortniteSession);

    this.sessions.set(AuthSessionStoreKey.Fortnite, fortniteSession);
  }

  /**
   * Authentication via a refresh token
   * @param refreshTokenResolvable A resolvable refresh token
   */
  private async refreshTokenAuthenticate(refreshTokenResolvable: AuthStringResolveable, authClient: AuthClient) {
    const lifecycle = this.lifecycle;
    const refreshToken = await resolveAuthString(refreshTokenResolvable);
    this.ensureActive(lifecycle);

    const fortniteSession = await FortniteAuthSession.create(this.client, AuthClients[authClient].clientId, AuthClients[authClient].secret, {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      token_type: 'eg1',
    });
    this.ensureActive(lifecycle, fortniteSession);

    this.sessions.set(AuthSessionStoreKey.Fortnite, fortniteSession);
  }

  /**
   * Authentication via a launcher refresh token
   * @param refreshTokenResolvable A resolvable refresh token
   */
  private async launcherRefreshTokenAuthenticate(refreshTokenResolvable: AuthStringResolveable, authClient: AuthClient) {
    const lifecycle = this.lifecycle;
    const refreshToken = await resolveAuthString(refreshTokenResolvable);
    this.ensureActive(lifecycle);

    const launcherSession = await LauncherAuthSession.create(
      this.client,
      AuthClients.launcherAppClient2.clientId,
      AuthClients.launcherAppClient2.secret,
      {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        token_type: 'eg1',
      },
    );
    this.ensureActive(lifecycle, launcherSession);

    this.sessions.set(AuthSessionStoreKey.Launcher, launcherSession);

    const exchangeCode = await launcherSession.createExchangeCode();
    this.ensureActive(lifecycle);

    const fortniteSession = await FortniteAuthSession.create(this.client, AuthClients[authClient].clientId, AuthClients[authClient].secret, {
      grant_type: 'exchange_code',
      exchange_code: exchangeCode,
      token_type: 'eg1',
    });
    this.ensureActive(lifecycle, fortniteSession);

    this.sessions.set(AuthSessionStoreKey.Fortnite, fortniteSession);
  }

  private async fortniteEOSAuthenticate() {
    const lifecycle = this.lifecycle;
    const exchangeCode = await this.sessions.get(AuthSessionStoreKey.Fortnite)!.createExchangeCode();
    this.ensureActive(lifecycle);
    const authClient = this.client.config.auth.authClient!;

    const eosSession = await EOSAuthSession.create(
      this.client,
      AuthClients[authClient].clientId,
      AuthClients[authClient].secret,
      {
        grant_type: 'exchange_code',
        exchange_code: exchangeCode,
      },
      {
        // base payload used for initial & refresh auth
        token_type: 'epic_id',
        deployment_id: this.client.config.eosDeploymentId,
      },
    );
    this.ensureActive(lifecycle, eosSession);

    this.sessions.set(AuthSessionStoreKey.FortniteEOS, eosSession);
  }
}

export default Auth;
