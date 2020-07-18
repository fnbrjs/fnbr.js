const PartyMessage = require('./PartyMessage');

/**
 * The party multi user chatroom
 */
class PartyChat {
  /**
   * @param {Object} party the party
   */
  constructor(party) {
    Object.defineProperty(this, 'Party', { value: party });
    Object.defineProperty(this, 'Client', { value: this.Party.Client });
    Object.defineProperty(this, 'Stream', { value: this.Client.Xmpp.stream });

    /**
     * If the client is connected to the chatroom
     */
    this.connected = false;

    /**
     * This chatrooms jid
     */
    this.jid = `Party-${this.Party.id}@muc.prod.ol.epicgames.com`;

    /**
     * The clients nick in the chatroom
     */
    this.nick = `${this.Client.account.displayName}:${this.Client.account.id}:${this.Client.Xmpp.resource}`;
  }

  /**
   * Send a message to this chatroom
   * @param {String} message message to send
   * @returns {PartyMessage} party message
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
   * Join this chatroom
   */
  join() {
    this.Stream.joinRoom(this.jid, this.nick);
    return new Promise((res, rej) => {
      this.Stream.once('muc:join', () => { res(); this.connected = true; });
      setTimeout(() => rej(new Error('Cannot join party chat: Timeout of 20000ms exceed')), 20000);
    });
  }

  /**
   * Leave this chatroom
   */
  leave() {
    this.Stream.leaveRoom(this.jid, this.nick);
    return new Promise((res) => {
      this.Stream.once('muc:leave', () => { res(); this.connected = false; });
      setTimeout(() => { res(); this.connected = false; }, 5000);
    });
  }

  /**
   * Wait for the client to connect to the chatroom
   */
  waitForConnected() {
    if (this.connected) return true;
    return new Promise((res) => {
      setInterval(() => {
        if (this.connected) res(true);
      }, 200);
      setTimeout(() => res(false), 10000);
    });
  }
}

module.exports = PartyChat;
