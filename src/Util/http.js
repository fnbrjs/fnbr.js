/* eslint-disable no-underscore-dangle */
const Request = require('request-promise');

class Http {
  constructor(client) {
    this.Client = client;
    this.jar = Request.jar();
    this.options = {
      timeout: 10000,
      headers: { },
      json: true,
      jar: this.jar,
      ...this.Client.config.http,
    };
    this.request = Request.defaults(this.options);
  }

  async send(checkToken, method, url, auth, headers, data, form, noJSON = false) {
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

    if (noJSON) reqOptions.json = false;

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
