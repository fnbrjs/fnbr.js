/* eslint-disable no-underscore-dangle */
const Request = require('request-promise');

/**
 * The client uses this to communicate with epics http services
 */
class Http {
  /**
   * @param {Object} client the main client
   */
  constructor(client) {
    /**
     * The main client
     */
    this.Client = client;

    /**
     * Cookie jar
     */
    this.jar = Request.jar();

    /**
     * Default requests options
     */
    this.options = {
      timeout: 10000,
      headers: { },
      json: true,
      jar: this.jar,
      ...this.Client.config.http,
    };

    /**
     * Request method
     */
    this.request = Request.defaults(this.options);
  }

  /**
   * Send a request
   * @param {Boolean} checkToken if the bearer token expiration time should be checked
   * @param {String} method http method
   * @param {String} url request url
   * @param {String} auth Authorization header
   * @param {Object} headers request headers
   * @param {Object} data request body
   * @param {Object} form request form
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
      if (err.error.errorCode === 'errors.com.epicgames.common.authentication.authentication_failed') await this.Client.restart();
      return { success: false, response: err.error };
    }
  }
}

module.exports = Http;
