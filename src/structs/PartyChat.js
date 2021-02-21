const PartyMessage = require('./PartyMessage');

/**
 * Represents the chat room of a party
 */
class PartyChat {
  /**
   * @param {Object} party The chatroom's party
   */
  constructor(party) {
    Object.defineProperty(this, 'party', { value: party });
    Object.defineProperty(this, 'client', { value: this.party.client });
    Object.defineProperty(this, 'stream', { value: this.client.xmpp.stream });

    /**
     * Whether the client is connected to the chat room or not
     * @type {boolean}
     */
    this.connected = false;

    /**
     * The jid of this chat room
     * @type {string}
     */
    this.jid = `Party-${this.party.id}@muc.prod.ol.epicgames.com`;

    /**
     * The nick of the client's user in this chat room
     * @type {string}
     */
    this.nick = `${this.client.user.displayName}:${this.client.user.id}:${this.client.xmpp.resource}`;
  }

  /**
   * Sends a message to this chat room
   * @param {string} message The message to be sent
   * @returns {Promise<PartyMessage>}
   */
  async send(message) {
    if (!await this.waitForConnected()) return undefined;
    const msgId = this.stream.sendMessage({
      to: this.jid,
      type: 'groupchat',
      body: message,
    });
    return new Promise((res, rej) => {
      this.stream.once(`message#${msgId}:sent`, () => res(new PartyMessage(this.client, { body: message, author: this.party.me, chat: this })));
      setTimeout(() => rej(new Error('Failed sending a party message: Message timeout of 20000ms exceeded')), 20000);
    });
  }

  /**
   * Joins this chat room
   * @returns {Promise<void>}
   */
  join() {
    this.stream.joinRoom(this.jid, this.nick);
    return new Promise((res, rej) => {
      this.stream.once('muc:join', () => { res(); this.connected = true; });
      setTimeout(() => rej(new Error('Cannot join party chat: Timeout of 20000ms exceed')), 20000);
    });
  }

  /**
   * Leaves this chat room
   * @returns {Promise<void>}
   */
  leave() {
    this.stream.leaveRoom(this.jid, this.nick);
    return new Promise((res) => {
      this.stream.once('muc:leave', () => { res(); this.connected = false; });
      setTimeout(() => { res(); this.connected = false; }, 5000);
    });
  }

  /**
   * Waits until the client is connected to this chatroom
   * @returns {Promise<boolean>}
   */
  waitForConnected() {
    if (this.connected) return true;
    return new Promise((res) => {
      const waitInterval = setInterval(() => {
        if (this.connected) {
          clearInterval(waitInterval);
          res(true);
        }
      }, 200);
      setTimeout(() => res(false), 10000);
    });
  }
}

module.exports = PartyChat;
