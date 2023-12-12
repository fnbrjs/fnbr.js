import Base from '../Base';
import AsyncLock from '../util/AsyncLock';
import type Client from '../Client';
import type { AuthData } from '../../resources/structs';
import type { AuthSessionType } from '../../resources/enums';

/**
 * Represents an auth session
 */
abstract class AuthSession<T extends AuthSessionType> extends Base {
  /**
   * The access token
   */
  public accessToken: string;

  /**
   * The time when the access token expires
   */
  public expiresAt: Date;

  /**
   * The account id
   */
  public accountId: string;

  /**
   * The client id
   */
  public clientId: string;

  /**
   * The auth session type
   */
  public type: T;

  /**
   * The client secret
   */
  public clientSecret: string;

  /**
   * The refresh lock
   */
  public refreshLock: AsyncLock;
  constructor(client: Client, data: AuthData, clientSecret: string, type: T) {
    super(client);

    this.accessToken = data.access_token;
    this.expiresAt = new Date(data.expires_at);
    this.accountId = data.account_id;
    this.clientId = data.client_id;

    this.type = type;
    this.clientSecret = clientSecret;

    this.refreshLock = new AsyncLock();
  }

  public get isExpired() {
    return this.expiresAt.getTime() < Date.now();
  }
}

export default AuthSession;
