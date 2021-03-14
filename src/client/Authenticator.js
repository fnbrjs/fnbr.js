/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable camelcase */
const { readFile } = require('fs').promises;
const Collection = require('@discordjs/collection');
const Base = require('./Base');
const Endpoints = require('../../resources/Endpoints');
const Tokens = require('../../resources/Tokens');

/**
 * Represents the authentication manager of a client
 * @extends {Base}
 * @private
 */
class Authenticator extends Base {
  /**
   * @param {Client} client The main client
   */
  constructor(client) {
    super(client);

    /**
     * The authentification data
     * @type {Collection.Collection<string, AuthData>}
     */
    this.auths = new Collection();

    /**
     * The client's account
     * @type {AuthAccount}
     */
    this.account = {
      id: undefined,
      displayName: undefined,
    };
  }

  /**
   * Starts the authentication process
   * @returns {Promise<Object>}
   */
  async authenticate() {
    this.client.debug('Authenticating...');
    const startAuth = new Date().getTime();

    const clientCredsAuth = await this.getOauthToken('client_credentials', {}, Tokens.FORTNITE_IOS);
    if (!clientCredsAuth.success) return clientCredsAuth;

    this.auths.set('clientcreds', {
      token: clientCredsAuth.response.access_token,
      expires_at: clientCredsAuth.response.expires_at,
      refresh_token: clientCredsAuth.response.refresh_token,
    });

    let auth;
    const authCreds = this.client.config.auth;

    if (authCreds.deviceAuth) {
      auth = await this.deviceAuthAuthenticate(authCreds.deviceAuth);
    } else if (authCreds.exchangeCode) {
      auth = await this.exchangeCodeAuthenticate(authCreds.exchangeCode);
    } else if (authCreds.authorizationCode) {
      auth = await this.authorizationCodeAuthenticate(authCreds.authorizationCode);
    } else if (authCreds.refreshToken) {
      auth = await this.refreshTokenAuthenticate(authCreds.refreshToken);
    } else if (authCreds.deviceCode) {
      auth = await this.deviceCodeAuthenticate();
    } else {
      return { success: false, response: 'No valid auth method found! Please provide one in the client config' };
    }

    if (!auth.success) return auth;

    this.auths.set('fortnite', {
      token: auth.response.access_token,
      expires_at: auth.response.expires_at,
      refresh_token: auth.response.refresh_token,
    });

    this.account = {
      id: auth.response.account_id,
      displayName: auth.response.displayName,
    };

    await this.client.http.send(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL_MULTIPLE}?killType=OTHERS_ACCOUNT_CLIENT_SERVICE`, 'fortnite');

    if (this.client.config.auth.checkEULA) {
      const EULAstatus = await this.acceptEULA();
      if (!EULAstatus.success) this.client.debug('EULA checking failed!');
      if (EULAstatus.response.alreadyAccepted === false) this.client.debug('Successfully accepted the EULA!');
    }

    if (!authCreds.deviceAuth && this.client.listenerCount('deviceauth:created') > 0) {
      const deviceauth = await this.generateDeviceAuth();
      if (deviceauth.success) {
        const deviceAuth = { accountId: deviceauth.response.accountId, deviceId: deviceauth.response.deviceId, secret: deviceauth.response.secret };
        this.Client.emit('deviceauth:created', deviceAuth);
        this.Client.config.auth.deviceAuth = deviceAuth;
      } else this.Client.debug(`Couldn't create device auth: ${this.Client.parseError(deviceauth.response)}`);
    }

    this.client.debug(`Authentification successful (${((Date.now() - startAuth) / 1000).toFixed(2)}s)`);
    return auth;
  }

  /**
   * Checks if a token refresh is needed and reauthenticates if needed
   * @param {boolean} [forceVerify=false] Whether the access token should be verified via an endpoint
   * @param {string} authType The auth type (eg "fortnite" or "clientcreds")
   */
  async refreshToken(forceVerify = false, authType = 'fortnite') {
    let tokenIsValid = true;

    const authObject = this.auths.get(authType);
    if (!authObject) throw new Error('Cannot verify token: Auth type does not exist');

    if (forceVerify) {
      const tokenCheck = await this.client.http.send(false, 'GET', Endpoints.OAUTH_TOKEN_VERIFY, authType);
      if (tokenCheck.response.errorCode === 'errors.com.epicgames.common.oauth.invalid_token') tokenIsValid = false;
    }

    if (tokenIsValid) {
      const tokenExpires = new Date(authObject.expires_at).getTime();
      if (tokenExpires < (Date.now() + 1000 * 60 * 10)) tokenIsValid = false;
    }

    if (!tokenIsValid) {
      const reAuth = await this.reauthenticate(authType);
      if (!reAuth.success) return reAuth;
    }

    return { success: true };
  }

  /**
   * Reauthenticates / Refreshes the access token
   * @param {string} authType The auth type (eg "fortnite" or "clientcreds")
   * @returns {Promise<Object>}
   */
  async reauthenticate(authType) {
    if (this.client.reauthLock.active) return { success: true };

    const authObject = this.auths.get(authType);
    if (!authObject) throw new Error('Cannot verify token: Auth type does not exist');

    this.client.reauthLock.active = true;
    this.client.debug('Reauthenticating...');
    const startAuth = new Date().getTime();

    let auth = await this.getOauthToken('refresh_token', { refresh_token: authObject.refresh_token });

    if (!auth.success) {
      if (authType === 'clientcreds') auth = await this.getOauthToken('client_credentials', {}, Tokens.FORTNITE_IOS);
      else if (this.client.config.auth.deviceAuth) auth = await this.deviceAuthAuthenticate(this.client.config.auth.deviceAuth);
    }

    if (!auth.success) {
      this.client.reauthLock.active = false;
      return auth;
    }

    this.auths.set(authType, {
      token: auth.response.access_token,
      expires_at: auth.response.expires_at,
      refresh_token: auth.response.refresh_token,
    });

    this.client.debug(`Reauthentification successful (${((Date.now() - startAuth) / 1000).toFixed(2)}s)`);
    this.client.reauthLock.active = false;
    return { success: true };
  }

  /**
   * Kill all active auth sessions
   */
  async killTokens() {
    const proms = [];
    for (const [authType, auth] of this.auths) {
      proms.push(this.client.http.send(false, 'DELETE', `${Endpoints.OAUTH_TOKEN_KILL}/${auth.token}`, authType));
    }

    await Promise.all(proms);
    this.auths.clear();
  }

  /**
   * Authenticates using device auth
   * @param {Object|string|function} deviceAuth The device auth credentials
   * @returns {Promise<Object>}
   */
  async deviceAuthAuthenticate(deviceAuth) {
    let parsedDeviceAuth;

    switch (typeof deviceAuth) {
      case 'function': parsedDeviceAuth = await deviceAuth(); break;
      case 'string': try {
        parsedDeviceAuth = JSON.parse(await readFile(deviceAuth));
      } catch (err) {
        return { success: false, response: `The file ${deviceAuth} is not existing or formatted incorrectly` };
      } break;
      case 'object': parsedDeviceAuth = deviceAuth; break;
      default: return { success: false, response: `${typeof deviceAuth} is not a valid deviceAuth type` };
    }

    const authFormData = {
      account_id: parsedDeviceAuth.accountId || parsedDeviceAuth.account_id,
      device_id: parsedDeviceAuth.deviceId || parsedDeviceAuth.device_id,
      secret: parsedDeviceAuth.secret,
    };

    return this.getOauthToken('device_auth', authFormData, parsedDeviceAuth.basicToken || Tokens.FORTNITE_IOS);
  }

  /**
   * Authenticates using an exchange code
   * @param {string|function} exchangeCode The exchange code
   * @param {BasicToken} [token=FORTNITE_IOS] The basic token that will be used
   * @returns {Promise<Object>}
   */
  async exchangeCodeAuthenticate(exchangeCode, token = Tokens.FORTNITE_IOS) {
    let parsedExchangeCode;

    switch (typeof exchangeCode) {
      case 'function': parsedExchangeCode = await exchangeCode(); break;
      case 'string': if (exchangeCode.endsWith('.json')) {
        try {
          parsedExchangeCode = JSON.parse(await readFile(exchangeCode));
        } catch (err) {
          return { success: false, response: `The file ${exchangeCode} is not existing or formatted incorrectly` };
        }
      } else {
        parsedExchangeCode = exchangeCode; break;
      } break;
      default: return { success: false, response: `${typeof exchangeCode} is not a valid exchangeCode type` };
    }

    return this.getOauthToken('exchange_code', { exchange_code: parsedExchangeCode }, token);
  }

  /**
   * Authenticates using an authorization code
   * @param {string|function} authorizationCode The authorization code
   * @returns {Promise<Object>}
   */
  async authorizationCodeAuthenticate(authorizationCode) {
    let parsedAuthorizationCode;

    switch (typeof authorizationCode) {
      case 'function': parsedAuthorizationCode = await authorizationCode(); break;
      case 'string': if (authorizationCode.endsWith('.json')) {
        try {
          parsedAuthorizationCode = JSON.parse(await readFile(authorizationCode));
        } catch (err) {
          return { success: false, response: `The file ${authorizationCode} is not existing or formatted incorrectly` };
        }
      } else {
        parsedAuthorizationCode = authorizationCode; break;
      } break;
      default: return { success: false, response: `${typeof authorizationCode} is not a valid authorizationCode type` };
    }

    return this.getOauthToken('authorization_code', { code: parsedAuthorizationCode }, Tokens.FORTNITE_IOS);
  }

  /**
   * Authenticates using a refresh token
   * @param {string|function} refreshToken The refresh token
   * @returns {Promise<Object>}
   */
  async refreshTokenAuthenticate(refreshToken) {
    let parsedRefreshToken;

    switch (typeof refreshToken) {
      case 'function': parsedRefreshToken = await refreshToken(); break;
      case 'string': if (refreshToken.endsWith('.json')) {
        try {
          parsedRefreshToken = JSON.parse(await readFile(refreshToken));
        } catch (err) {
          return { success: false, response: `The file ${refreshToken} is not existing or formatted incorrectly` };
        }
      } else {
        parsedRefreshToken = refreshToken; break;
      } break;
      default: return { success: false, response: `${typeof refreshToken} is not a valid authorizationCode type` };
    }

    return this.getOauthToken('refresh_token', { refresh_token: parsedRefreshToken }, Tokens.FORTNITE_IOS);
  }

  /**
   * Authenticates using a device code
   * @returns {Promise<Object>}
   */
  async deviceCodeAuthenticate() {
    const deviceCode = await this.generateDeviceCode();
    if (!deviceCode.success) return deviceCode;

    if (this.client.listenerCount('devicecode:prompt') > 0) this.client.emit('devicecode:prompt', deviceCode.response.verification_uri_complete);
    else {
      this.client.debug(`Device code url: ${deviceCode.response.verification_uri_complete}`);
      this.client.debug('Please listen to the devicecode:prompt event instead of using the link above in production!');
    }

    const deviceCodeResponse = await this.useDeviceCode(deviceCode.response.device_code, deviceCode.response.interval);
    if (!deviceCodeResponse.success) return deviceCodeResponse;

    this.auths.set('fortniteswitch', {
      token: deviceCodeResponse.response.access_token,
      expires_at: deviceCodeResponse.response.expires_at,
      refresh_token: deviceCodeResponse.response.refresh_token,
    });

    const exchangeCodeResponse = await this.client.http.send(false, 'GET', Endpoints.OAUTH_EXCHANGE, 'fortniteswitch');

    return this.exchangeCodeAuthenticate(exchangeCodeResponse.response.code);
  }

  /**
   * Obtains an access token
   * @param {string} grant_type The grant type
   * @param {Object} valuePair The token value pair
   * @param {BasicToken} token The basic token
   * @returns {Promise<Object>}
   */
  async getOauthToken(grant_type, valuePair, token) {
    const formData = {
      grant_type,
      token_type: 'eg1',
      ...valuePair,
    };

    return this.client.http.send(false, 'POST', Endpoints.OAUTH_TOKEN_CREATE, `basic ${token}`, { 'Content-Type': 'application/x-www-form-urlencoded' }, null, formData);
  }

  /**
   * Creates a device code
   * @returns {Promise<Object>}
   */
  async generateDeviceCode() {
    const switchTokenRequest = await this.getOauthToken('client_credentials', {}, Tokens.FORTNITE_SWITCH);
    if (!switchTokenRequest.success) return switchTokenRequest;

    this.auths.set('clientcredsswitch', {
      token: switchTokenRequest.response.access_token,
      expires_at: switchTokenRequest.response.expires_at,
      refresh_token: switchTokenRequest.response.refresh_token,
    });

    const deviceCodeRequest = await this.client.http.send(false, 'POST', Endpoints.OAUTH_DEVICE_CODE, 'clientcredsswitch',
      { 'Content-Type': 'application/x-www-form-urlencoded' }, 'prompt=login');

    return deviceCodeRequest;
  }

  /**
   * Creates a device code
   * @param {string} deviceCode The device code
   * @param {number} interval The request interval in seconds
   * @returns {Promise<Object>}
   */
  useDeviceCode(deviceCode, interval) {
    return new Promise((res) => {
      const reqInterval = setInterval(async () => {
        const accessTokenRequest = await this.getOauthToken('device_code', { device_code: deviceCode }, Tokens.FORTNITE_SWITCH);
        if (accessTokenRequest.success) {
          clearInterval(reqInterval);
          res(accessTokenRequest);
        }
      }, interval * 1000);
      setTimeout(() => {
        clearInterval(reqInterval);
        res({ success: false, response: 'Device code timeout of 300000ms exceeded' });
      }, 300000);
    });
  }

  /**
   * Generates a device auth
   * @returns {Promise<Object>}
   */
  async generateDeviceAuth() {
    return this.client.http.send(true, 'POST', `${Endpoints.OAUTH_DEVICE_AUTH}/${this.account.id}/deviceAuth`, 'fortnite');
  }

  /**
   * Accepts EULA if needed
   * @returns {Promise<Object>}
   */
  async acceptEULA() {
    const EULAdata = await this.client.http.send(false, 'GET', `${Endpoints.INIT_EULA}/account/${this.account.id}`, 'fortnite');
    if (!EULAdata.success) return EULAdata;
    if (!EULAdata.response) return { success: true, response: { alreadyAccepted: true } };

    const EULAaccepted = await this.client.http.send(false, 'POST',
      `${Endpoints.INIT_EULA}/version/${EULAdata.response.version}/account/${this.account.id}/accept?locale=${EULAdata.response.locale}`, 'fortnite');
    if (!EULAaccepted.success) return EULAaccepted;

    const FortniteAccess = await this.client.http.send(false, 'POST', `${Endpoints.INIT_GRANTACCESS}/${this.account.id}`, 'fortnite');
    if (!FortniteAccess.success) return FortniteAccess;

    return { success: true, response: { alreadyAccepted: false } };
  }
}

module.exports = Authenticator;
