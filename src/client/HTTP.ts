/* eslint-disable no-restricted-syntax */
import axios from 'axios';
import { URLSearchParams } from 'url';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import EpicgamesGraphQLError from '../exceptions/EpicgamesGraphQLError';
import Base from './Base';
import type { AuthType } from '../../resources/structs';
import type { EpicgamesAPIResponse, EpicgamesGraphQLResponse, HTTPResponse } from '../../resources/httpResponses';
import type {
  AxiosError, AxiosInstance, AxiosResponse, HeadersDefaults, Method, RawAxiosRequestConfig, ResponseType,
} from 'axios';
import type Client from './Client';

interface KeyValuePair {
  [key: string]: any;
}

/**
 * Represents the client's HTTP manager
 * @private
 */
class HTTP extends Base {
  /**
   * The default requests options
   */
  public options: RawAxiosRequestConfig;

  /**
   * The axios instance
   * @type {AxiosInstance}
   */
  public axios: AxiosInstance;

  /**
   * @param {Client} client The main client
   */
  constructor(client: Client) {
    super(client);

    this.options = {
      ...this.client.config.http,
    };

    this.axios = axios.create(this.options);

    // Clear all default content type headers
    (Object.keys(this.axios.defaults.headers) as (keyof HeadersDefaults)[]).forEach((h) => {
      delete this.axios.defaults.headers[h]?.['Content-Type'];
    });
  }

  /**
   * Sends a HTTP request
   * @param method The HTTP method
   * @param url The uri
   * @param headers The headers
   * @param body The body
   * @param form The form
   * @param responseType The axios response type
   * @param retries How many times this request has been retried
   */
  public async send(
    method: Method,
    url: string,
    headers: KeyValuePair = {},
    body?: any,
    form?: KeyValuePair,
    responseType?: ResponseType,
    retries = 0,
  ): Promise<HTTPResponse> {
    let data;

    if (body) data = body;
    else if (form) {
      const urlSearchParams = new URLSearchParams();
      for (const key of Object.keys(form)) {
        urlSearchParams.append(key, form[key]);
      }

      data = urlSearchParams;
    }

    const finalHeaders = headers;

    if (!finalHeaders['Accept-Language']) finalHeaders['Accept-Language'] = this.client.config.language;

    const reqStartTime = Date.now();
    try {
      const response = await this.axios.request({
        method,
        url,
        headers: finalHeaders,
        data,
        responseType,
      });
      this.client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s): `
        + `${response.status} ${response.statusText || '???'}`, 'http');
      return { response };
    } catch (err: any) {
      this.client.debug(`${method} ${url} (${((Date.now() - reqStartTime) / 1000).toFixed(2)}s): `
        + `${err.response?.status || '???'} ${err.response?.statusText || '???'}`, 'http');

      const errResponse = (err as AxiosError).response;
      const errResponseData = errResponse?.data as any;

      if (errResponse?.status.toString().startsWith('5') && retries < this.client.config.restRetryLimit) {
        return this.send(method, url, headers, body, form, responseType, retries + 1);
      }

      if (errResponse && (errResponse.status === 429 || errResponseData?.errorCode === 'errors.com.epicgames.common.throttled')) {
        const retryString = errResponse.headers['retry-after']
          || errResponseData?.messageVars?.[0]
          || errResponseData?.errorMessage?.match(/(?<=in )\d+(?= second)/)?.[0];
        const retryAfter = parseInt(retryString, 10);
        if (!Number.isNaN(retryAfter)) {
          const sleepTimeout = (retryAfter * 1000) + 500;
          await new Promise((res) => {
            setTimeout(res, sleepTimeout);
          });

          return this.send(method, url, headers, body, form, responseType);
        }
      }

      return { error: err as AxiosError };
    }
  }

  /**
   * Sends a HTTP request to the Epicgames API
   * @param checkToken Whether the access token should be validated
   * @param method The HTTP method
   * @param url The uri
   * @param auth The auth type (eg. "fortnite" or "clientcreds")
   * @param headers The headers
   * @param data The body
   * @param form The form
   * @param ignoreLocks Where the request should ignore locks such as the reauth lock
   */
  public async sendEpicgamesRequest(
    checkToken: boolean,
    method: Method,
    url: string,
    auth?: AuthType,
    headers: KeyValuePair = {},
    data?: any,
    form?: KeyValuePair,
    ignoreLocks = false,
  ): Promise<EpicgamesAPIResponse> {
    if (!ignoreLocks) await this.client.reauthLock.wait();

    const finalHeaders = headers;
    if (auth) {
      let authData = this.client.auth.auths.get(auth);
      if (authData && checkToken) {
        const tokenCheck = await this.client.auth.checkToken(auth);
        if (!tokenCheck) {
          const reauth = await this.client.auth.reauthenticate();
          if (reauth.error) return reauth;
          authData = this.client.auth.auths.get(auth);
        }
      }

      finalHeaders.Authorization = `bearer ${authData?.token}`;
    }

    const request = await this.send(method, url, finalHeaders, data, form);

    if (['errors.com.epicgames.common.oauth.invalid_token', 'errors.com.epicgames.common.authentication.token_verification_failed']
      .includes((request.error?.response?.data as any)?.errorCode) && auth) {
      const authData = this.client.auth.auths.get(auth);
      if (authData) {
        const reauth = await this.client.auth.reauthenticate();
        if (reauth.error) return reauth;
        return this.sendEpicgamesRequest(checkToken, method, url, auth, headers, data, form, ignoreLocks);
      }
    }

    return {
      response: request.response?.data,
      error: request.error && request.error.response && new EpicgamesAPIError(
        request.error.response?.data as any,
        request.error?.config as any,
        request.error.response.status as number,
      ),
    };
  }

  /**
   * Sends a HTTP request to the Epicgames GraphQL API
   * @param checkToken Whether the access token should be validated
   * @param url The uri
   * @param query The GraphQL query string
   * @param variables The GraphQL variables
   * @param auth The auth type (eg. "fortnite" or "clientcreds")
   * @param operationName The GraphQL operation name (optional, will be auto set)
   * @param ignoreLocks Where the request should ignore locks such as the reauth lock
   */
  public async sendEpicgamesGraphQLRequest(
    checkToken: boolean,
    url: string,
    query: string,
    variables: KeyValuePair = {},
    auth?: AuthType,
    operationName?: string,
    ignoreLocks = false,
  ): Promise<EpicgamesGraphQLResponse> {
    if (!ignoreLocks) await this.client.reauthLock.wait();

    const headers: KeyValuePair = {
      'Content-Type': 'application/json',
    };

    if (auth) {
      let authData = this.client.auth.auths.get(auth);
      if (authData && checkToken) {
        const tokenCheck = await this.client.auth.checkToken(auth);
        if (!tokenCheck) {
          const reauth = await this.client.auth.reauthenticate();
          if (reauth.error) return reauth;
          authData = this.client.auth.auths.get(auth);
        }
      }

      headers.Authorization = `bearer ${authData?.token}`;
    }

    const finalOperationName = operationName || query.match(/((?<=mutation )|(?<=query ))\w+/)?.[0];

    const request = await this.send('POST', url, headers, {
      operationName: finalOperationName,
      variables,
      query,
    });

    const response: { response?: AxiosResponse, error?: AxiosError | EpicgamesGraphQLError } = request;

    if (request.response?.data?.errors?.[0]) {
      response.error = new EpicgamesGraphQLError(request.response?.data?.errors[0], request.response.config);
      request.response = undefined;
    }

    return {
      response: response.response?.data,
      error: response.error,
    };
  }
}

export default HTTP;
