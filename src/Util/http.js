/* eslint-disable no-underscore-dangle */
const Request = require('request-promise');
const Constants = require('../../resources/Constants');

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

    /**
     * The cookie jar
     * @type {CookieJar}
     */
    this.jar = Request.jar();

    /* this.options = {
      timeout: 10000,
      headers: { },
      json: true,
      jar: this.jar,
      ...this.Client.config.http,
    }; */
    /**
     * The default requests options
     * @type {HttpOptions}
     */
    this.options = this.Client.mergeDefault(Constants.DefaultConfig.http, this.Client.config.http);
    if (!this.Client.config.http.jar) this.options.jar = this.jar;

    /**
     * The request method
     * @type {RequestAPI}
     */
    this.request = Request.defaults(this.options);
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
    if (this.Client.reauthLock.active) await this.Client.reauthLock.wait();
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

    if (data) reqOptions.body = data;
    else if (form) reqOptions.form = form;

    if (headers) reqOptions.headers = { ...reqOptions.headers, ...headers };

    try {
      if (this.Client.config.httpDebug) this.Client.debug(`${method} ${url}`);
      const response = await this.request(reqOptions);
      return { success: true, response };
    } catch (err) {
      return { success: false, response: err.error };
    }
  }
}

module.exports = Http;
