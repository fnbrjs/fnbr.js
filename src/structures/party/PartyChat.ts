import Base from '../../Base';
import PartyMessage from './PartyMessage';
import PartyChatConversationNotFoundError from '../../exceptions/PartyChatConversationNotFoundError';
import { ConversationType } from '../../../resources/enums';
import type Client from '../../Client';
import type ClientParty from './ClientParty';
import type ClientPartyMember from './ClientPartyMember';

/**
 * Represents a party's conversation
 */
class PartyChat extends Base {
  /**
   * The chat room's party
   */
  public party: ClientParty;

  /**
   * @param client The main client
   * @param party The chat room's party
   */
  constructor(client: Client, party: ClientParty) {
    super(client);

    this.party = party;
  }

  /**
   * the party chat's conversation id
   */
  public get conversationId() {
    return this.party.id;
  }

  /**
   * Sends a message to this party chat
   * @param content The message that will be sent
   * @throws {PartyChatConversationNotFoundError} When the client is the only party member
   */
  public async send(content: string) {
    if (this.party.members.size < 2) {
      throw new PartyChatConversationNotFoundError();
    }

    const messageId = await this.client.chat.sendMessageInConversation(
      this.conversationId,
      {
        body: content,
      },
      this.party.members
        .filter((m) => m.id !== this.client.user.self!.id)
        .map((x) => x.id),
      ConversationType.Party,
    );

    return new PartyMessage(this.client, {
      author: this.party.me as ClientPartyMember,
      content,
      party: this.party,
      id: messageId,
    });
  }
}

export default PartyChat;
