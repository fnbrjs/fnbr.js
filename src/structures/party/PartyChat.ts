import { deprecate } from 'util';
import Base from '../../Base';
import AsyncLock from '../../util/AsyncLock';
import PartyMessage from './PartyMessage';
import PartyChatConversationNotFoundError from '../../exceptions/PartyChatConversationNotFoundError';
import { ConversationType } from '../../../resources/enums';
import type Client from '../../Client';
import type ClientParty from './ClientParty';
import type ClientPartyMember from './ClientPartyMember';

const deprecationNotOverXmppAnymore = 'Party Chat is not done over XMPP anymore, this function will be removed in a future version';

/**
 * Represents a party's conversation
 */
class PartyChat extends Base {
  /**
   * The chat room's JID
   * @deprecated since chat is not done over xmpp anymore, this property will always be an empty string and will be removed in a future version
   */
  public jid: string;

  /**
   * the party chat's conversation id
   */
  public get conversationId() {
    return `p-${this.party.id}`;
  }

  /**
   * The client's chat room nickname
   * @deprecated since chat is not done over xmpp anymore, this property will always be an empty string  and will be removed in a future version
   */
  public nick: string;

  /**
   * The chat room's join lock
   * @deprecated since chat is not done over xmpp anymore, this is not used anymore and will be removed in a future version
   */
  public joinLock: AsyncLock;

  /**
   * The chat room's party
   */
  public party: ClientParty;

  /**
   * Whether the client is connected to the party chat
   * @deprecated since chat is not done over xmpp anymore, this property will always be true and will be removed in a future version
   */
  public isConnected: boolean;

  /**
   * @param client The main client
   * @param party The chat room's party
   */
  constructor(client: Client, party: ClientParty) {
    super(client);

    // xmpp legacy (only here for backwards compatibility)
    this.joinLock = new AsyncLock();
    this.nick = '';
    this.jid = '';
    this.isConnected = true;

    this.party = party;
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

  /**
   * Joins this party chat
   * @deprecated since chat is not done over xmpp anymore, this function will do nothing and will be removed in a future version
   */
  // eslint-disable-next-line class-methods-use-this
  public async join() {
    const deprecatedFn = deprecate(() => { }, deprecationNotOverXmppAnymore);

    return deprecatedFn();
  }

  /**
   * Leaves this party chat
   * @deprecated since chat is not done over xmpp anymore, this function will do nothing and will be removed in a future version
   */
  // eslint-disable-next-line class-methods-use-this
  public async leave() {
    const deprecatedFn = deprecate(() => { }, deprecationNotOverXmppAnymore);

    return deprecatedFn();
  }

  /**
    * Ban a member from this party chat
    * @param member The member that should be banned
    * @deprecated since chat is not done over xmpp anymore, this function will do nothing and will be removed in a future version
    */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  public async ban(member: string) {
    const deprecatedFn = deprecate(() => { }, deprecationNotOverXmppAnymore);

    return deprecatedFn();
  }
}

export default PartyChat;
