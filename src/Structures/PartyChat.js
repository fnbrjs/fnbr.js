const PartyMessage = require('./PartyMessage');

/**
 * Represents the chat room of a party
 */
class PartyChat {
  /**
   * @param {Object} party The chatroom's party
   */
  constructor(party) {
    Object.defineProperty(this, 'Party', { value: party });
    Object.defineProperty(this, 'Client', { value: this.Party.Client });
    Object.defineProperty(this, 'Stream', { value: this.Client.Xmpp.stream });

    /**
     * Whether the client is connected to the chat room or not
     * @type {boolean}
     */
    this.connected = false;

    /**
     * The jid of this chat room
     * @type {string}
     */
    this.jid = `Party-${this.Party.id}@muc.prod.ol.epicgames.com`;

    /**
     * The nick of the client's user in this chat room
     * @type {string}
     */
    this.nick = `${this.Client.user.displayName}:${this.Client.user.id}:${this.Client.Xmpp.resource}`;
  }

  /**
   * Sends a message to this chat room
   * @param {string} message The message to be sent
   * @returns {Promise<PartyMessage>}
   */
  async send(message) {
    if (!await this.waitForConnected()) return undefined;
    const msgId = this.Stream.sendMessage({
      to: this.jid,
      type: 'groupchat',
      body: message,
    });
    return new Promise((res, rej) => {
      this.Stream.once(`message#${msgId}:sent`, () => res(new PartyMessage(this.Client, { body: message, author: this.Party.me, chat: this })));
      setTimeout(() => rej(new Error('Failed sending a party message: Message timeout of 20000ms exceeded')), 20000);
    });
  }

  /**
   * Joins this chat room
   * @returns {Promise<void>}
   */
  join() {
    this.Stream.joinRoom(this.jid, this.nick);
    return new Promise((res, rej) => {
      this.Stream.once('muc:join', () => { res(); this.connected = true; });
      setTimeout(() => rej(new Error('Cannot join party chat: Timeout of 20000ms exceed')), 20000);
    });
  }

  /**
   * Leaves this chat room
   * @returns {Promise<void>}
   */
  leave() {
    this.Stream.leaveRoom(this.jid, this.nick);
    return new Promise((res) => {
      this.Stream.once('muc:leave', () => { res(); this.connected = false; });
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
