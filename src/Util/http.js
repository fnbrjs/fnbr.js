/* eslint-disable no-underscore-dangle */
const Request = require('request-promise');

class Http {
  constructor(client) {
    this.Client = client;
    this.jar = Request.jar();
    this.options = {
      timeout: 5000,
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
      // if (this.Client.config.httpDebug && headers) this.Client.debug(headers);
      // if (this.Client.config.httpDebug && form) this.Client.debug(form);
      const response = await this.request(reqOptions);
      return { success: true, response };
    } catch (err) {
      return { success: false, response: err.error };
    }
  }
}

module.exports = Http;
