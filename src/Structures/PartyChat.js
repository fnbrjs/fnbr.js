const PartyMessage = require('./PartyMessage');

class PartyChat {
  constructor(party) {
    Object.defineProperty(this, 'Party', { value: party });
    Object.defineProperty(this, 'Client', { value: this.Party.Client });
    Object.defineProperty(this, 'Stream', { value: this.Client.Xmpp.stream });

    this.connected = false;

    this.jid = `Party-${this.Party.id}@muc.prod.ol.epicgames.com`;
    this.nick = `${this.Client.account.displayName}:${this.Client.account.id}:${this.Client.Xmpp.resource}`;
  }

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

  join() {
    this.Stream.joinRoom(this.jid, this.nick);
    return new Promise((res, rej) => {
      this.Stream.once('muc:join', () => { res(); this.connected = true; });
      setTimeout(() => rej(new Error('Cannot join party chat: Timeout of 20000ms exceed')), 20000);
    });
  }

  leave() {
    this.Stream.leaveRoom(this.jid, this.nick);
    return new Promise((res) => {
      this.Stream.once('muc:leave', () => { res(); this.connected = false; });
      setTimeout(() => { res(); this.connected = false; }, 5000);
    });
  }

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
