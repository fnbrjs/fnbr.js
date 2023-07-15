import axios, { AxiosError } from 'axios';
import Base from '../Base';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import { invalidTokenCodes } from '../../resources/constants';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import type { AuthSessionStoreKey } from '../../resources/enums';
import type Client from '../Client';
import type { AxiosInstance, HeadersDefaults, AxiosRequestConfig } from 'axios';

interface RequestHeaders {
  [key: string]: any;
}

type RequestConfig = Omit<AxiosRequestConfig, 'headers'> & {
  headers?: RequestHeaders;
};

/**
 * Represents the client's HTTP manager
 * @private
 */
class HTTP extends Base {
  /**
   * The axios instance
   */
  private axios: AxiosInstance;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.axios = axios.create({
      ...this.client.config.http,
      headers: {
        'Content-Type': null,
        ...this.client.config.http.headers,
      },
    });

    // Clear all default content type headers
    (Object.keys(this.axios.defaults.headers) as (keyof HeadersDefaults)[]).forEach((h) => {
      delete this.axios.defaults.headers[h]?.['Content-Type'];
    });
  }

  /**
   * Sends an HTTP request
   * @param config The request config
   * @param auth The auth session to use
   * @param retries How many times this request has been retried (5xx errors)
   */
  public async request<T = any>(config: RequestConfig, retries = 0): Promise<T> {
    const reqStartTime = Date.now();
    try {
      const response = await this.axios.request<T>({
        ...config,
        headers: {
          'Accept-Language': this.client.config.language,
          ...config.headers,
        },
      });

      const reqDuration = ((Date.now() - reqStartTime) / 1000);
      this.client.debug(`${config.method?.toUpperCase() ?? 'GET'} ${config.url} (${reqDuration.toFixed(2)}s): `
        + `${response.status} ${response.statusText}`, 'http');

      return response.data;
    } catch (err: any) {
      const reqDuration = ((Date.now() - reqStartTime) / 1000);
      if (err instanceof AxiosError) {
        const errResponse = err.response;
        const errResponseData = errResponse?.data;

        this.client.debug(`${config.method?.toUpperCase() ?? 'GET'} ${config.url} (${reqDuration.toFixed(2)}s): `
          + `${errResponse?.status} ${errResponse?.statusText}`, 'http');

        if (errResponse?.status.toString().startsWith('5') && retries < this.client.config.restRetryLimit) {
          return this.request(config, retries + 1);
        }

        if (errResponse && (errResponse.status === 429 || errResponseData?.errorCode === 'errors.com.epicgames.common.throttled')) {
          const retryString = errResponse.headers['retry-after']
            || errResponseData?.messageVars?.[0]
            || errResponseData?.errorMessage?.match(/(?<=in )\d+(?= second)/)?.[0];
          const retryAfter = parseInt(retryString, 10);
          if (!Number.isNaN(retryAfter)) {
            const sleepTimeout = (retryAfter * 1000) + 500;
            await new Promise((res) => setTimeout(res, sleepTimeout));

            return this.request(config, retries);
          }
        }
      } else {
        this.client.debug(`${config.method?.toUpperCase() ?? 'GET'} ${config.url} `
          + `(${reqDuration.toFixed(2)}s): ${err.name} - ${err.message}`, 'http');
      }

      throw err;
    }
  }

  /**
   * Sends an HTTP request to the Fortnite API
   * @param config The request config
   * @param includeAuthentication Whether to include authentication
   * @throws {EpicgamesAPIError}
   * @throws {AxiosError}
   */
  public async epicgamesRequest<T = any>(config: RequestConfig, auth?: AuthSessionStoreKey): Promise<T> {
    if (auth) {
      const authSession = this.client.auth.sessions.get(auth);
      if (!authSession) throw new AuthenticationMissingError(auth);

      await authSession.refreshLock.wait();
    }

    try {
      return await this.request<T>({
        ...config,
        ...auth && {
          headers: {
            ...config.headers,
            Authorization: `bearer ${this.client.auth.sessions.get(auth)!.accessToken}`,
          },
        },
      });
    } catch (err: any) {
      if (err instanceof AxiosError) {
        if (auth && invalidTokenCodes.includes(err.response?.data?.errorCode)) {
          await this.client.auth.sessions.get(auth)!.refresh();

          return this.epicgamesRequest(config, auth);
        }

        if (typeof err.response?.data?.errorCode === 'string') {
          throw new EpicgamesAPIError(err.response.data, config, err.response.status);
        }
      }

      throw err;
    }
  }
}

export default HTTP;
