import type { AxiosRequestConfig } from 'axios';
import type { EpicgamesGraphQLErrorData, EpicgamesGraphQLErrorLocation } from '../../resources/httpResponses';
import type EpicgamesAPIError from './EpicgamesAPIError';

/**
 * Represets a GraphQL HTTP error from the Epicgames GraphQL API
 */
class EpicgamesGraphQLError extends Error {
  /**
   * The Epicgames API Error the GraphQL internally received
   */
  public serviceResponse?: EpicgamesAPIError;

  /**
   * The error locations within the client's GraphQL query
   */
  public locations: EpicgamesGraphQLErrorLocation[];

  /**
   * The GraphQL query path where this error occurred
   */
  public path: string[];

  /**
   * The URL of the requested API endpoint
   */
  public url: string;

  /**
   * The request data sent by the client
   */
  public requestData: any;

  /**
   * @param error The raw Epicgames GraphQL API error data
   * @param request The client's request
   */
  constructor(error: EpicgamesGraphQLErrorData, request: AxiosRequestConfig) {
    super();
    this.name = 'EpicgamesGraphQLError';
    this.message = error.message;

    this.url = request.url || '';
    this.serviceResponse = error.serviceResponse && JSON.parse(error.serviceResponse);
    this.locations = error.locations;
    this.path = error.path;
    this.requestData = request.data;
  }
}

export default EpicgamesGraphQLError;
