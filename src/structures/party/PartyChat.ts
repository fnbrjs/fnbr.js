import Base from '../../client/Base';
import Client from '../../client/Client';
import SendMessageError from '../../exceptions/SendMessageError';
import AsyncLock from '../../util/AsyncLock';
import ClientParty from './ClientParty';
import ClientPartyMember from './ClientPartyMember';
import PartyMessage from './PartyMessage';

/**
 * Represents a party's multi user chat room (MUC)
 */
class PartyChat extends Base {
  /**
   * The chat room's JID
   */
  public jid: string;

  /**
   * The client's chat room nickname
   */
  public nick: string;

  /**
   * The chat room's join lock
   */
  public joinLock: AsyncLock;

  /**
   * The chat room's party
   */
  public party: ClientParty;

  /**
   * Whether the client is connected to the party chat
   */
  public isConnected: boolean;

  /**
   * @param client The main client
   * @param party The chat room's party
   */
  constructor(client: Client, party: ClientParty) {
    super(client);

    this.joinLock = new AsyncLock();
    this.joinLock.lock();

    this.party = party;
    this.jid = `Party-${this.party?.id}@muc.prod.ol.epicgames.com`;
    this.nick = `${this.client.user?.displayName}:${this.client.user?.id}:${this.client.xmpp.resource}`;
    this.isConnected = false;
  }

  /**
   * Sends a message to this party chat
   * @param content The message that will be sent
   */
  public async send(content: string) {
    await this.joinLock.wait();
    if (!this.isConnected) await this.join();

    const message = await this.client.xmpp.sendMessage(this.jid, content, 'groupchat');

    if (!message) throw new SendMessageError('Message timeout exceeded', 'PARTY', this.party);

    return new PartyMessage(this.client, {
      author: this.party.me as ClientPartyMember, content, party: this.party, id: message.id as string,
    });
  }

  /**
   * Joins this party chat
   */
  public async join() {
    this.joinLock.lock();
    await this.client.xmpp.joinMUC(this.jid, this.nick);
    this.isConnected = true;
    this.joinLock.unlock();
  }

  /**
   * Leaves this party chat
   */
  public async leave() {
    await this.client.xmpp.leaveMUC(this.jid, this.nick);
    this.isConnected = false;
  }
}

export default PartyChat;
