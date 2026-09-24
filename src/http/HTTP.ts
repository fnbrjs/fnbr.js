import axios from 'axios';
import Base from '../Base';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import { invalidTokenCodes } from '../../resources/constants';
import EpicgamesAPIError from '../exceptions/EpicgamesAPIError';
import RetryAbandonedError from '../exceptions/RetryAbandonedError';
import { RetryDecision } from '../../resources/enums';
import type { AuthSessionStoreKey } from '../../resources/enums';
import type { EpicgamesAPIErrorData } from '../../resources/httpResponses';
import type Client from '../Client';
import type { AxiosInstance, HeadersDefaults, AxiosRequestConfig } from 'axios';

interface RequestHeaders {
  [key: string]: any;
}

type RequestConfig = Omit<AxiosRequestConfig, 'headers'> & {
  headers?: RequestHeaders;
};

export type RetryDecisionCallback = () => RetryDecision;

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
   * @param retryDecision The callback deciding how to handle a rate limit retry
   * @param retries How many times this request has been retried (5xx errors)
   */
  public async request<T = any>(
    config: RequestConfig,
    retryDecision?: RetryDecisionCallback,
    retries = 0,
  ): Promise<T> {
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
    } catch (err: unknown) {
      const reqDuration = ((Date.now() - reqStartTime) / 1000);
      if (axios.isAxiosError<EpicgamesAPIErrorData>(err)) {
        const errResponse = err.response;
        const errResponseData = errResponse?.data;

        this.client.debug(`${config.method?.toUpperCase() ?? 'GET'} ${config.url} (${reqDuration.toFixed(2)}s): `
          + `${errResponse?.status} ${errResponse?.statusText}`, 'http');

        if (errResponse?.status.toString().startsWith('5') && retries < this.client.config.restRetryLimit) {
          return this.request(config, retryDecision, retries + 1);
        }

        if (
          this.client.config.handleRatelimits && errResponse
          && (errResponse.status === 429 || errResponseData?.errorCode === 'errors.com.epicgames.common.throttled')
        ) {
          const retryString = errResponse.headers['retry-after']
            || errResponseData?.messageVars[0]
            || errResponseData?.errorMessage.match(/(?<=in )\d+(?= second)/)?.[0];
          const retryAfter = parseInt(retryString, 10);
          if (!Number.isNaN(retryAfter)) {
            let decision = retryDecision?.() ?? RetryDecision.Retry;
            if (decision === RetryDecision.Abandon) throw new RetryAbandonedError();
            if (decision === RetryDecision.Throw) throw err;

            await new Promise<void>((resolve) => {
              setTimeout(resolve, (retryAfter * 1000) + 100);
            });

            decision = retryDecision?.() ?? RetryDecision.Retry;
            if (decision === RetryDecision.Abandon) throw new RetryAbandonedError();
            if (decision === RetryDecision.Throw) throw err;

            return this.request(config, retryDecision, retries);
          }
        }
      } else {
        const error = err instanceof Error ? err : new Error(String(err));
        this.client.debug(`${config.method?.toUpperCase() ?? 'GET'} ${config.url} `
          + `(${reqDuration.toFixed(2)}s): ${error.name} - ${error.message}`, 'http');
      }

      throw err;
    }
  }

  /**
   * Sends an HTTP request to the Fortnite API
   * @param config The request config
   * @param auth The auth session to use
   * @param retryDecision The callback deciding how to handle a rate limit retry
   * @throws {EpicgamesAPIError}
   * @throws {AxiosError}
   * @throws {RetryAbandonedError}
   */
  public async epicgamesRequest<T = any>(
    config: RequestConfig,
    auth?: AuthSessionStoreKey,
    retryDecision?: RetryDecisionCallback,
  ): Promise<T> {
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
      }, retryDecision);
    } catch (err: unknown) {
      if (axios.isAxiosError<EpicgamesAPIErrorData>(err)) {
        const errorData = err.response?.data;
        if (auth && errorData && invalidTokenCodes.includes(errorData.errorCode)) {
          await this.client.auth.sessions.get(auth)!.refresh();

          return this.epicgamesRequest(config, auth, retryDecision);
        }

        if (errorData && err.response) {
          throw new EpicgamesAPIError(errorData, config, err.response.status);
        }
      }

      throw err;
    }
  }
}

export default HTTP;
