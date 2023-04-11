import BaseMessage from '../BaseMessage';
import type { PartyMessageData } from '../../../resources/structs';
import type Client from '../../Client';
import type ClientParty from './ClientParty';
import type PartyMember from './PartyMember';

/**
 * Represents a party chat message
 */
class PartyMessage extends BaseMessage {
  /**
   * The message's author
   */
  public author!: PartyMember;

  /**
   * The message's party
   */
  public party: ClientParty;

  /**
   * @param client The main client
   * @param data The message's data
   */
  constructor(client: Client, data: PartyMessageData) {
    super(client, data);

    this.party = data.party;
  }

  /**
   * Replies to this party chat message
   * @param content The message that will be sent
   * @throws {SendMessageError} The message failed to send
   */
  public reply(content: string) {
    return this.party.chat.send(content);
  }
}

export default PartyMessage;
