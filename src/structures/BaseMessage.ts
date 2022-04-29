import { MessageData } from '../../resources/structs';
import Base from '../client/Base';
import Client from '../client/Client';
import ClientPartyMember from './party/ClientPartyMember';
import ClientUser from './user/ClientUser';
import Friend from './friend/Friend';
import PartyMember from './party/PartyMember';

/**
 * Represents a message
 */
abstract class BaseMessage extends Base {
  /**
   * The message's content
   */
  public content: string;

  /**
   * The message's author
   */
  public author: Friend | PartyMember | ClientPartyMember | ClientUser;

  /**
   * The message creation date
   */
  public sentAt: Date;

  /**
   * The message's id
   */
  public id: string;

  /**
   * @param client The main client
   * @param data The message's data
   */
  constructor(client: Client, data: MessageData) {
    super(client);

    this.content = data.content;
    this.author = data.author;
    this.sentAt = data.sentAt || new Date();
    this.id = data.id;
  }
}

export default BaseMessage;
