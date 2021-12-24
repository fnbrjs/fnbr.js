/* eslint-disable no-restricted-syntax */
import Collection from '@discordjs/collection';
import { promises as fs } from 'fs';
import { URL } from 'url';
import Base from './Base';
import Client from './Client';
import AuthClients from '../../resources/AuthClients';
import {
  AuthData, AuthClient, AuthType, AuthStringResolveable, DeviceAuthResolveable,
  AuthResponse, DeviceAuthWithSnakeCaseSupport,
} from '../../resources/structs';
import Endpoints from '../../resources/Endpoints';
import { EpicgamesOAuthResponse } from '../../resources/httpResponses';

interface KeyValuePair {
  [key: string]: any;
}

/**
 * Represents the client's authentication manager
 * @private
 */
class Auth extends Base {
  /**
   * The client's active auth sessions
   */
  public auths: Collection<AuthType, AuthData>;

  /**
   * A timeout that handles auth refreshing
   */
  // eslint-disable-next-line no-undef
  private authRefreshTimeout?: NodeJS.Timeout;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.auths = new Collection();
  }

  /**
   * Authenticates the client against EpicGames' API
   */
  public async authenticate(): Promise<AuthResponse> {
    this.client.debug('[AUTH] Authenticating...');
    const authStartTime = Date.now();

    const authClient = this.client.config.auth.authClient || 'fortniteIOSGameClient';

    const clientCredsAuthProm = this.getOAuthToken('client_credentials', {}, authClient);

    let auth: AuthResponse;
    const authCreds = this.client.config.auth;

    if (authCreds.launcherRefreshToken) {
      auth = await this.launcherRefreshTokenAuthenticate(authCreds.launcherRefreshToken, authClient);
    } else if (authCreds.deviceAuth) {
      auth = await this.deviceAuthAuthenticate(authCreds.deviceAuth, authClient);
    } else if (authCreds.refreshToken) {
      auth = await this.refreshTokenAuthenticate(authCreds.refreshToken, authClient);
    } else if (authCreds.exchangeCode) {
      auth = await this.exchangeCodeAuthenticate(authCreds.exchangeCode, authClient);
    } else if (authCreds.authorizationCode) {
      auth = await this.authorizationCodeAuthenticate(authCreds.authorizationCode, authClient);
    } else {
      return { error: new Error('No valid auth method found! Please provide one in the client config') };
    }

    if (!auth.response) return auth;

    this.auths.set('fortnite', {
      token: auth.response.access_token,
      expires_at: auth.response.expires_at,
      refresh_token: auth.response.refresh_token,
      client: authClient,
      account_id: auth.response.account_id,
    });

    if (this.authRefreshTimeout) clearTimeout(this.authRefreshTimeout);
    this.authRefreshTimeout = this.client.setTimeout(async () => {
      await this.reauthenticate();
    }, (auth.response.expires_in * 1000) - 10 * 60 * 1000);

    if (!authCreds.launcherRefreshToken && this.client.listenerCount('refreshtoken:created') > 0) {
      const launcherAuth = await this.exchangeAuth('fortnite', 'launcherAppClient2');

      this.client.emit('refreshtoken:created', {
        token: launcherAuth.response.refresh_token,
        expiresIn: launcherAuth.response.refresh_expires,
        expiresAt: launcherAuth.response.refresh_expires_at,
        accountId: launcherAuth.response.account_id,
        displayName: launcherAuth.response.displayName,
        clientId: launcherAuth.response.client_id,
      });

      this.auths.set('launcher', {
        token: launcherAuth.response.access_token,
        refresh_token: launcherAuth.response.refresh_token,
        expires_at: launcherAuth.response.expires_at,
        client: 'launcherAppClient2',
        account_id: launcherAuth.response.account_id,
      });
    }

    if (authCreds.createLauncherSession && !this.auths.has('launcher')) {
      const launcherAuth = await this.exchangeAuth('fortnite', 'launcherAppClient2');

      this.auths.set('launcher', {
        token: launcherAuth.response.access_token,
        refresh_token: launcherAuth.response.refresh_token,
        expires_at: launcherAuth.response.expires_at,
        client: 'launcherAppClient2',
        account_id: launcherAuth.response.account_id,
      });
    }

    if (this.client.config.auth.killOtherTokens) {
      await this.client.http.sendEpicgamesRequest(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL_MULTIPLE}?killType=OTHERS_ACCOUNT_CLIENT_SERVICE`, 'fortnite');
    }

    if (this.client.config.auth.checkEULA) {
      const eulaCheck = await this.acceptEULA();
      if (!eulaCheck.response) return eulaCheck;
      if (!eulaCheck.response.alreadyAccepted) this.client.debug('[AUTH] Successfully accepted the EULA');
    }

    if (!authCreds.deviceAuth && this.client.listenerCount('deviceauth:created') > 0) {
      const deviceauth = await this.createDeviceAuth();
      if (deviceauth.response) {
        const deviceAuth = { accountId: deviceauth.response.accountId, deviceId: deviceauth.response.deviceId, secret: deviceauth.response.secret };
        this.client.emit('deviceauth:created', deviceAuth);
        this.client.config.auth.deviceAuth = deviceAuth;
      } else this.client.debug(`[AUTH] Couldn't create device auth: ${deviceauth.error?.message} (${deviceauth.error?.code})`);
    }

    const clientCredsAuth = await clientCredsAuthProm;
    if (!clientCredsAuth.response) return clientCredsAuth;

    this.auths.set('fortniteClientCredentials', {
      token: clientCredsAuth.response.access_token,
      expires_at: clientCredsAuth.response.expires_at,
      refresh_token: clientCredsAuth.response.refresh_token,
      client: authClient,
    });

    this.client.debug(`[AUTH] Authentification successful (${((Date.now() - authStartTime) / 1000).toFixed(2)}s)`);

    return auth;
  }

  /**
   * Force refreshes a single auth session
   * @param authData The authentication data
   * @param authType The authentication type
   */
  private async refreshAuth(authData: AuthData, authType: AuthType) {
    let reauth: EpicgamesOAuthResponse;

    if (authType === 'fortniteClientCredentials') {
      reauth = await this.getOAuthToken('client_credentials', {}, authData.client);
    } else {
      reauth = await this.getOAuthToken('refresh_token', { refresh_token: authData.refresh_token }, authData.client);
    }

    return reauth;
  }

  /**
   * Force refreshes all auth sessions
   */
  public async reauthenticate() {
    if (this.client.reauthLock.isLocked) {
      await this.client.reauthLock.wait();
      return { response: { success: true } };
    }

    this.client.reauthLock.lock();
    this.client.debug('[AUTH] Reauthenticating...');
    const authStartTime = Date.now();

    const authResponses = await Promise.all(this.auths.map((authData, authType) => this.refreshAuth(authData, authType)
      .then((auth) => ({ authData, authType, auth }))));

    const failedOAuthResponse = authResponses.find((res) => !res.auth.response);
    if (failedOAuthResponse) {
      if (this.client.config.restartOnInvalidRefresh) {
        this.client.debug(`[AUTH] Reauthentification failed for session "${failedOAuthResponse.authType}" `
          + `(${failedOAuthResponse.auth.error?.code || 'no error code'}). Attempting restart...`);

        this.auths.clear(); // making sure that the client will not use the invalid refresh token
        this.client.reauthLock.unlock();

        await this.client.restart();

        return { response: { success: true } };
      }

      this.client.debug(`[AUTH] Reauthentification failed for session "${failedOAuthResponse.authType}" `
        + `(${failedOAuthResponse.auth.error?.code || 'no error code'}). The client will now shut down`);

      this.auths.clear();
      this.client.reauthLock.unlock();
      await this.client.logout();

      return { error: failedOAuthResponse.auth.error! };
    }

    for (const authResponse of authResponses) {
      this.auths.set(authResponse.authType, {
        token: authResponse.auth.response!.access_token,
        expires_at: authResponse.auth.response!.expires_at,
        refresh_token: authResponse.auth.response!.refresh_token,
        client: authResponse.authData.client,
        account_id: authResponse.auth.response!.account_id,
      });

      if (authResponse.authType === 'launcher') {
        this.client.emit('refreshtoken:created', {
          token: authResponse.auth.response!.refresh_token,
          expiresIn: authResponse.auth.response!.refresh_expires,
          expiresAt: authResponse.auth.response!.refresh_expires_at,
          accountId: authResponse.auth.response!.account_id,
          displayName: authResponse.auth.response!.displayName,
          clientId: authResponse.auth.response!.client_id,
        });
      }
    }

    if (this.authRefreshTimeout) clearTimeout(this.authRefreshTimeout);
    this.authRefreshTimeout = this.client.setTimeout(async () => {
      await this.reauthenticate();
    }, (authResponses.find((res) => res.authType === 'fortnite')!.auth.response!.expires_in * 1000) - 10 * 60 * 1000);

    this.client.reauthLock.unlock();
    this.client.debug(`[AUTH] Reauthentification successful (${((Date.now() - authStartTime) / 1000).toFixed(2)}s)`);

    return { response: { success: true } };
  }

  /**
   * Obtains an oauth token from EpicGames' OAuth API
   * @param grantType OAuth grant type such as `device_auth`, `exchange_code` or `authorization_code`
   * @param grantData Raw grant data.
   * @param authClient OAuth client such as `fortniteIOSGameClient`
   */
  private async getOAuthToken(grantType: string, grantData: KeyValuePair, authClient: AuthClient): Promise<EpicgamesOAuthResponse> {
    const authClientData = AuthClients[authClient];
    const authClientToken = Buffer.from(`${authClientData.clientId}:${authClientData.secret}`).toString('base64');

    const formData = {
      grant_type: grantType,
      token_type: 'eg1',
      ...grantData,
    };

    return this.client.http.sendEpicgamesRequest(false, 'POST', Endpoints.OAUTH_TOKEN_CREATE, undefined, {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `basic ${authClientToken}`,
    }, null, formData, true);
  }

  /**
   * Kills all active auth sessions
   */
  public async killAllTokens() {
    const proms = [];
    for (const [authType, auth] of this.auths.filter((a) => !!a.account_id && a.client !== 'launcherAppClient2')) {
      proms.push(this.client.http.sendEpicgamesRequest(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL}/${auth.token}`, authType));
    }

    await Promise.all(proms);
    this.auths.clear();
  }

  /**
   * Checks if an OAuth token is valid. Refreshes it if needed
   * @param auth The auth type
   * @param forceVerify Whether the token should be verified via the Epicgames API
   */
  public async checkToken(auth: AuthType, forceVerify = false) {
    let tokenIsValid = true;

    const authData = this.auths.get(auth);
    if (!authData) return false;

    if (forceVerify) {
      const tokenCheck = await this.client.http.sendEpicgamesRequest(false, 'GET', Endpoints.OAUTH_TOKEN_VERIFY, undefined, {
        Authorization: `bearer ${authData.token}`,
      });

      if (tokenCheck.error?.code === 'errors.com.epicgames.common.oauth.invalid_token') tokenIsValid = false;
    }

    if (tokenIsValid) {
      const tokenExpires = new Date(authData.expires_at).getTime();
      if (tokenExpires < (Date.now() + 1000 * 60 * 10)) tokenIsValid = false;
    }

    return tokenIsValid;
  }

  /**
   * Accepts the Fortnite End User License Agreement (EULA)
   */
  private async acceptEULA() {
    const EULAdata = await this.client.http.sendEpicgamesRequest(false, 'GET', `${Endpoints.INIT_EULA}/account/${this.auths.get('fortnite')?.account_id}`, 'fortnite');
    if (EULAdata.error) return EULAdata;
    if (!EULAdata.response) return { response: { alreadyAccepted: true } };

    const EULAaccepted = await this.client.http.sendEpicgamesRequest(false, 'POST',
      `${Endpoints.INIT_EULA}/version/${EULAdata.response.version}/account/${this.auths.get('fortnite')?.account_id}/accept?locale=${EULAdata.response.locale}`, 'fortnite');
    if (EULAaccepted.error) return EULAaccepted;

    const fortniteAccess = await this.client.http.sendEpicgamesRequest(false, 'POST', `${Endpoints.INIT_GRANTACCESS}/${this.auths.get('fortnite')?.account_id}`, 'fortnite');
    if (fortniteAccess.error) return fortniteAccess;

    return { response: { alreadyAccepted: false } };
  }

  /**
   * Creates a device auth
   */
  private async createDeviceAuth() {
    return this.client.http.sendEpicgamesRequest(true, 'POST', `${Endpoints.OAUTH_DEVICE_AUTH}/${this.auths.get('fortnite')?.account_id}/deviceAuth`, 'fortnite');
  }

  private async exchangeAuth(authType: AuthType, targetClient: AuthClient) {
    const exchangeCode = await this.client.http.sendEpicgamesRequest(true, 'GET', Endpoints.OAUTH_EXCHANGE, authType);
    if (exchangeCode.error || !exchangeCode.response) return exchangeCode;

    return this.getOAuthToken('exchange_code', { exchange_code: exchangeCode.response.code }, targetClient);
  }

  /**
   * Authentication via a device auth
   * @param deviceAuthResolvable A resolvable device auth
   */
  private async deviceAuthAuthenticate(deviceAuthResolvable: DeviceAuthResolveable, authClient: AuthClient) {
    let deviceAuth: DeviceAuthWithSnakeCaseSupport;

    switch (typeof deviceAuthResolvable) {
      case 'function':
        deviceAuth = await deviceAuthResolvable() as DeviceAuthWithSnakeCaseSupport;
        break;
      case 'string':
        try {
          deviceAuth = JSON.parse((await fs.readFile(deviceAuthResolvable)).toString());
        } catch (err) {
          return { error: err as Error };
        }
        break;
      case 'object':
        deviceAuth = deviceAuthResolvable as DeviceAuthWithSnakeCaseSupport;
        break;
      default:
        return { error: new TypeError(`${typeof deviceAuthResolvable} is not a valid device auth type`) };
    }

    return this.getOAuthToken('device_auth', {
      account_id: deviceAuth.accountId || deviceAuth.account_id,
      device_id: deviceAuth.deviceId || deviceAuth.device_id,
      secret: deviceAuth.secret,
    }, authClient);
  }

  /**
   * Authentication via an exchange code
   * @param exchangeCodeResolvable A resolvable exchange code
   */
  private async exchangeCodeAuthenticate(exchangeCodeResolvable: AuthStringResolveable, authClient: AuthClient) {
    let exchangeCode: string;

    switch (typeof exchangeCodeResolvable) {
      case 'function':
        exchangeCode = await exchangeCodeResolvable();
        break;
      case 'string':
        if (exchangeCodeResolvable.length === 32) {
          exchangeCode = exchangeCodeResolvable;
        } else {
          try {
            exchangeCode = (await fs.readFile(exchangeCodeResolvable)).toString();
          } catch (err) {
            return { error: err as Error };
          }
        }
        break;
      default:
        return { error: new TypeError(`${typeof exchangeCodeResolvable} is not a valid exchange code type`) };
    }

    return this.getOAuthToken('exchange_code', { exchange_code: exchangeCode }, authClient);
  }

  /**
   * Authentication via an authorization code
   * @param authorizationCodeResolvable A resolvable authorization code
   */
  private async authorizationCodeAuthenticate(authorizationCodeResolvable: AuthStringResolveable, authClient: AuthClient) {
    let authorizationCode: string | undefined;

    switch (typeof authorizationCodeResolvable) {
      case 'function':
        authorizationCode = await authorizationCodeResolvable();
        break;
      case 'string':
        if (authorizationCodeResolvable.length === 32) {
          authorizationCode = authorizationCodeResolvable;
        } else if (authorizationCodeResolvable.includes('?code=')) {
          try {
            const url = new URL(authorizationCodeResolvable);
            authorizationCode = url.searchParams.get('code') || undefined;
          } catch (err) {
            return { error: err as Error };
          }
        } else {
          try {
            authorizationCode = (await fs.readFile(authorizationCodeResolvable)).toString();
          } catch (err) {
            return { error: err as Error };
          }
        }
        break;
      default:
        return { error: new TypeError(`${typeof authorizationCodeResolvable} is not a valid authorization code type`) };
    }

    return this.getOAuthToken('authorization_code', { code: authorizationCode }, authClient);
  }

  /**
   * Authentication via a refresh token
   * @param refreshTokenResolvable A resolvable refresh token
   */
  private async refreshTokenAuthenticate(refreshTokenResolvable: AuthStringResolveable, authClient: AuthClient) {
    let refreshToken: string;

    switch (typeof refreshTokenResolvable) {
      case 'function':
        refreshToken = await refreshTokenResolvable();
        break;
      case 'string':
        if (refreshTokenResolvable.length === 32 || refreshTokenResolvable.startsWith('eg1')) {
          refreshToken = refreshTokenResolvable;
        } else {
          try {
            refreshToken = (await fs.readFile(refreshTokenResolvable)).toString();
          } catch (err) {
            return { error: err as Error };
          }
        }
        break;
      default:
        return { error: new TypeError(`${typeof refreshTokenResolvable} is not a valid refresh token type`) };
    }

    return this.getOAuthToken('refresh_token', { refresh_token: refreshToken }, authClient);
  }

  /**
   * Authentication via a launcher refresh token
   * @param refreshTokenResolvable A resolvable refresh token
   */
  private async launcherRefreshTokenAuthenticate(refreshTokenResolvable: AuthStringResolveable, authClient: AuthClient) {
    let refreshToken: string;

    switch (typeof refreshTokenResolvable) {
      case 'function':
        refreshToken = await refreshTokenResolvable();
        break;
      case 'string':
        if (refreshTokenResolvable.length === 32 || refreshTokenResolvable.startsWith('eg1')) {
          refreshToken = refreshTokenResolvable;
        } else {
          try {
            refreshToken = (await fs.readFile(refreshTokenResolvable)).toString();
          } catch (err) {
            return { error: err as Error };
          }
        }
        break;
      default:
        return { error: new TypeError(`${typeof refreshTokenResolvable} is not a valid refresh token type`) };
    }

    const launcherAuth = await this.getOAuthToken('refresh_token', { refresh_token: refreshToken }, 'launcherAppClient2');
    if (launcherAuth.error || !launcherAuth.response) return launcherAuth;

    this.auths.set('launcher', {
      token: launcherAuth.response.access_token,
      refresh_token: launcherAuth.response.refresh_token,
      expires_at: launcherAuth.response.expires_at,
      client: 'launcherAppClient2',
      account_id: launcherAuth.response.account_id,
    });

    this.client.emit('refreshtoken:created', {
      token: launcherAuth.response.refresh_token,
      expiresIn: launcherAuth.response.refresh_expires,
      expiresAt: launcherAuth.response.refresh_expires_at,
      accountId: launcherAuth.response.account_id,
      displayName: launcherAuth.response.displayName,
      clientId: launcherAuth.response.client_id,
    });

    return this.exchangeAuth('launcher', authClient);
  }
}

export default Auth;
