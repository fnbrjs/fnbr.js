const axios = require('axios').default;
const Base = require('./Base');
const { ClientOptions } = require('../../resources/Constants');

/**
 * Represents the HTTP manager of a client
 * @private
 */
class HTTP extends Base {
  /**
   * @param {Client} client The main client
   */
  constructor(client) {
    super(client);

    /* this.options = {
      timeout: 10000,
      headers: { },
      json: true,
      ...this.client.config.http,
    }; */
    /**
     * The default requests options
     * @type {HTTPOptions}
     */
    this.options = this.client.mergeDefault(ClientOptions.http, this.client.config.http);

    /**
     * The axios instance
     * @type {AxiosInstance}
     */
    this.axios = axios.create(this.options);
    Object.keys(this.axios.defaults.headers).forEach((h) => delete this.axios.defaults.headers[h]['Content-Type']);
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
    if (this.client.reauthLock.active && url !== 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token') {
      await this.client.reauthLock.wait();
    }
    if (checkToken) {
      const tokenRefresh = await this.client.auth.refreshToken();
      if (!tokenRefresh.success) {
        this.client.debug('Restarting client as reauthentification failed: '
          + `${typeof tokenRefresh.response === 'object' ? JSON.stringify(tokenRefresh.response) : tokenRefresh.response}`);
        await this.client.restart();
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
      if (this.client.config.httpDebug) this.client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s)`);
      return { success: true, response: response.data };
    } catch (err) {
      if (this.Client.config.httpDebug) this.Client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s)`);
      if (checkToken && err.response.data.errorCode === 'errors.com.epicgames.common.oauth.invalid_token') {
        const reauth = await this.Client.Auth.reauthenticate();
        if (reauth.success) {
          this.client.debug(`Restarting client as reauthentification failed: ${this.client.parseError(reauth.response)}`);
          await this.client.restart();
        }
      }
      return { success: false, response: err.response.data };
    }
  }
}

module.exports = HTTP;
