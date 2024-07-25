import Base from '../../Base';
import AsyncLock from '../../util/AsyncLock';
import PartyMessage from './PartyMessage';
import type Client from '../../Client';
import type ClientParty from './ClientParty';
import type ClientPartyMember from './ClientPartyMember';

/**
 * Represents a party's conversation
 */
class PartyChat extends Base {
  /**
   * The chat room's JID
   * @deprecated since chat is not done over xmpp anymore, this property will always be an empty string
   */
  public jid: string;

  /**
   * the party chats conversation id
   */
  public get conversationId() {
    return `p-${this.party.id}`;
  }

  /**
   * The client's chat room nickname
   * @deprecated since chat is not done over xmpp anymore, this property will always be an empty string
   */
  public nick: string;

  /**
   * The chat room's join lock
   * @deprecated since chat is not done over xmpp anymore, this is not used anymore
   */
  public joinLock: AsyncLock;

  /**
   * The chat room's party
   */
  public party: ClientParty;

  /**
   * Whether the client is connected to the party chat
   * @deprecated since chat is not done over xmpp anymore, this property will always be true
   */
  public isConnected: boolean;

  /**
   * Holds the account ids, which will not receive party messages anymore from the currently logged in user
   */
  public bannedAccountIds: Set<string>;

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
    this.bannedAccountIds = new Set<string>();
  }

  /**
   * Sends a message to this party chat
   * @param content The message that will be sent
   */
  public async send(content: string) {
    const messageId = await this.client.chat.sendMessageInConversation(
      this.conversationId,
      {
        body: content,
      },
      this.party.members
        .filter((x) => !this.bannedAccountIds.has(x.id))
        .map((x) => x.id),
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
   * @deprecated since chat is not done over xmpp anymore, this function will do nothing
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  public async join() { }

  /**
   * Leaves this party chat
   * @deprecated since chat is not done over xmpp anymore, this function will do nothing
   */
  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
  public async leave() { }

  /**
   * Ban a member from receiving party messages from the logged in user
   * @param member The member that should be banned
   */
  public async ban(member: string) {
    this.bannedAccountIds.add(member);
  }

  /**
   * Unban a member from receiving party messages from the logged in user
   * @param member The member that should be unbanned
   */
  public async unban(member: string) {
    this.bannedAccountIds.delete(member);
  }
}

export default PartyChat;
