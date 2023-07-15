import Base from '../Base';
import type User from './user/User';
import type Client from '../Client';

/**
 * Represents a user's avatar
 */
class Avatar extends Base {
  /**
   * The user this avatar belongs to
   */
  public user: User;

  /**
   * The avatar's id
   */
  public id: string;

  /**
   * The avatar's namespace (eg. "fortnite")
   */
  public namespace: string;

  /**
   * @param client The main client
   * @param data The avatar's data
   * @param user The user this avatar belongs to
   */
  constructor(client: Client, data: any, user: User) {
    super(client);

    this.id = data.avatarId;
    this.namespace = data.namespace;
    this.user = user;
  }
}

export default Avatar;
