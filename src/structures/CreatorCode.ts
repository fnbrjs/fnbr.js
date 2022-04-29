import Client from '../client/Client';
import Base from '../client/Base';
import User from './user/User';
import { CreatorCodeData } from '../../resources/structs';

/**
 * Represents a Support-A-Creator code
 */
class CreatorCode extends Base {
  /**
   * The Support-A-Creator code (slug)
   */
  public code: string;

  /**
   * The code's owner
   */
  public owner: User;

  /**
   * Whether the code is enabled
   */
  public isEnabled: boolean;

  /**
   * Whether the code is verified
   */
  public isVerified: boolean;

  /**
   * @param client The main client
   * @param data The creator code data
   */
  constructor(client: Client, data: CreatorCodeData) {
    super(client);

    this.code = data.slug;
    this.owner = data.owner;
    this.isEnabled = data.status === 'ACTIVE';
    this.isVerified = data.verified;
  }
}

export default CreatorCode;
