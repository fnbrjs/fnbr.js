const axios = require('axios').default;
// eslint-disable-next-line no-unused-vars
const { ClientOptions, HttpOptions } = require('../../resources/Constants');

/**
 * Represents the HTTP manager of a client
 * @private
 */
class Http {
  /**
   * @param {Client} client The main client
   */
  constructor(client) {
    /**
     * The main client
     * @type {Client}
     */
    this.Client = client;

    /* this.options = {
      timeout: 10000,
      headers: { },
      json: true,
      ...this.Client.config.http,
    }; */
    /**
     * The default requests options
     * @type {HttpOptions}
     */
    this.options = this.Client.mergeDefault(ClientOptions.http, this.Client.config.http);

    /**
     * The axios instance
     * @type {AxiosInstance}
     */
    this.axios = axios.create(this.options);
  }

  /**
   * Sends a HTTP request
   * @param {boolean} checkToken Whether the access token should be checked if it's valid
   * @param {string} method The HTTP method
   * @param {string} url The uri
   * @param {string} auth The authorization header
   * @param {Object} headers The headers
   * @param {Object} data The body
   * @param {Object} form The form
   * @returns {Promise<Object>}
   */
  async send(checkToken, method, url, auth, headers, data, form) {
    if (this.Client.reauthLock.active && url !== 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token') {
      await this.Client.reauthLock.wait();
    }
    if (checkToken) {
      const tokenRefresh = await this.Client.Auth.refreshToken();
      if (!tokenRefresh.success) {
        this.Client.debug('Restarting client as reauthentification failed: '
          + `${typeof tokenRefresh.response === 'object' ? JSON.stringify(tokenRefresh.response) : tokenRefresh.response}`);
        await this.Client.restart();
      }
    }

    const reqOptions = {
      url,
      method,
      headers: { },
    };

    if (auth) reqOptions.headers.Authorization = auth;

    if (data) reqOptions.data = data;
    else if (form) {
      const urlSearchParams = new URLSearchParams();
      for (let i = 0; i < Object.keys(form).length; i += 1) {
        const key = Object.keys(form)[i];
        urlSearchParams.append(key, form[key]);
      }

      reqOptions.data = urlSearchParams;
    }

    if (headers) reqOptions.headers = { ...reqOptions.headers, ...headers };

    if (url.endsWith('.blurl')) reqOptions.responseType = 'arraybuffer';

    const reqStartTime = Date.now();
    try {
      const response = await this.axios.request(reqOptions);
      if (this.Client.config.httpDebug) this.Client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s)`);
      return { success: true, response: response.data };
    } catch (err) {
      if (this.Client.config.httpDebug) this.Client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s)`);
      if (checkToken && err.error.errorCode === 'errors.com.epicgames.common.oauth.invalid_token') {
        const reauth = await this.Client.Auth.reauthenticate();
        if (reauth.success) {
          this.Client.debug(`Restarting client as reauthentification failed: ${this.Client.parseError(reauth.response)}`);
          await this.Client.restart();
        }
      }
      return { success: false, response: err.error };
    }
  }
}

module.exports = Http;
