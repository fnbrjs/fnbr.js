/* eslint-disable max-len */
const { createClient } = require('stanza');
const UUID = require('uuid/v4');
const Endpoints = require('../../resources/Endpoints');
const FriendMessage = require('../Structures/FriendMessage');
const FriendPresence = require('../Structures/FriendPresence');
const Friend = require('../Structures/Friend');
const PendingFriend = require('../Structures/Friend');

class XMPP {
  constructor(client) {
    this.Client = client;
    this.stream = undefined;
    this.connected = false;
    this.isReconnecting = false;

    this.uuid = UUID().replace(/-/g, '').toUpperCase();
    this.resource = `V2:Fortnite:${this.Client.config.platform}::${this.uuid}`;
  }

  setup() {
    this.stream = createClient({
      wsURL: `wss://${Endpoints.XMPP_SERVER}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        jid: `${this.Client.account.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.Client.account.id,
        password: this.Client.Auth.auths.token,
      },
      resource: this.resource,
    });

    this.stream.enableKeepAlive({
      interval: 60,
    });

    this.setupEvents();
  }

  connect(isReconnect = false) {
    if (!isReconnect) this.Client.debug('XMPP-Client connecting...');
    else this.Client.debug('XMPP-Client reconnecting...');
    const startConnect = new Date().getTime();
    this.stream.connect();

    return new Promise((res) => {
      this.stream.once('session:started', async () => {
        this.connected = true;
        this.sendStatus(this.Client.config.status || 'Playing Battle Royale');
        if (!isReconnect) this.Client.debug(`XMPP-Client successfully connected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
        else this.Client.debug(`XMPP-Client successfully reconnected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
        res({ success: true });
      });
      this.stream.once('stream:error', (err) => res({ success: false, response: err }));
      setTimeout(() => res({ success: false, response: 'connection timeout of 10000ms exceed' }), 15000);
    });
  }

  disconnect() {
    this.Client.debug('XMPP-Client disconnecting...');
    const startDisconnect = new Date().getTime();
    this.stream.disconnect();
    this.connected = false;
    return new Promise((res) => {
      this.stream.once('disconnected', () => {
        this.Client.debug(`XMPP-Client successfully disconnected (${((Date.now() - startDisconnect) / 1000).toFixed(2)}s)`);
        res({ success: true });
      });
    });
  }

  async reconnect() {
    if (this.isReconnecting) return { success: true };
    this.isReconnecting = true;
    await this.disconnect();

    this.uuid = UUID().replace(/-/g, '').toUpperCase();
    this.resource = `V2:Fortnite:${this.Client.config.platform}::${this.uuid}`;

    this.stream.config = {
      ...this.stream.config,
      resource: this.resource,
      credentials: {
        jid: `${this.Client.account.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.Client.account.id,
        password: this.Client.Auth.auths.token,
      },
    };

    const reconnect = await this.connect(true);
    if (!reconnect.success) return reconnect;
    this.isReconnecting = false;
    return { success: true };
  }

  setupEvents() {
    this.stream.on('disconnected', () => {
      if (this.connected) {
        this.connected = false;
        this.connect(true);
      }
    });

    this.stream.on('raw:incoming', (raw) => {
      if (this.Client.config.xmppDebug) this.Client.debug(`IN ${raw}`);
    });

    this.stream.on('raw:outgoing', (raw) => {
      if (this.Client.config.xmppDebug) this.Client.debug(`OUT ${raw}`);
    });

    this.stream.on('message:sent', (m) => {
      this.stream.emit(`message#${m.id}:sent`);
    });

    this.stream.on('presence', (p) => {
      const fromId = p.from.split('@')[0];
      if (fromId === this.Client.account.id) {
        this.stream.emit(`presence#${p.id}:sent`);
        return;
      }
      const friendPresence = new FriendPresence(this.Client, JSON.parse(p.status), fromId);
      this.Client.friends.get(fromId).presence = friendPresence;
      this.Client.emit('friend:presence', friendPresence);
    });

    this.stream.on('chat', (c) => {
      const message = new FriendMessage(this.Client, c);
      this.Client.emit('friend:message', message);
    });

    this.stream.on('message', async (m) => {
      const body = JSON.parse(m.body);
      if (!body.type) return;
      switch (body.type) {
        case 'com.epicgames.friends.core.apiobjects.Friend': {
          await this.Client.waitUntilReady();
          const { payload } = body;
          const { status } = payload;
          const id = payload.accountId;
          let user;
          try {
            user = await this.Client.getProfile(id);
          } catch (err) {
            break;
          }
          if (status === 'ACCEPTED') {
            const friend = new Friend(this.Client, {
              ...user, favorite: payload.favorite, created: body.timestamp,
            });
            this.Client.friends.set(friend.id, friend);
            if (this.Client.pendingFriends.some((f) => f.friend.id === id)) {
              this.Client.pendingFriends.delete(id);
            }
            this.Client.emit('friend:added', friend);
            this.Client.emit(`friend#${id}:added`, friend);
          } else if (status === 'PENDING') {
            this.Client.debug('XMPP: Pending friend under construction!');
            const friend = new Friend(this.Client, { ...user, _status: 'PENDING', favorite: payload.favorite });
            const friendRequest = new PendingFriend(this.Client, { friend, direction: (payload.direction === 'INBOUND') ? 'INCOMING' : 'OUTGOING' });
            this.Client.pendingFriends.set(friend.id, friendRequest);
            this.Client.emit('friend:request', friendRequest);
            this.Client.emit(`friend#${id}:request`, friendRequest);
          }
        } break;

        case 'FRIENDSHIP_REMOVE': {
          const { reason } = body;
          const id = (body.from === this.Client.account.id) ? body.to : body.from;
          if (reason === 'ABORTED') {
            const friendRequest = this.Client.pendingFriends.get(id);
            this.Client.pendingFriends.delete(id);
            friendRequest.status = 'DECLINED';
            this.Client.emit('friend:request:abort', friendRequest);
            this.Client.emit(`friend#${id}:request:abort`, friendRequest);
          } else if (reason === 'REJECTED') {
            const friendRequest = this.Client.pendingFriends.get(id);
            this.Client.pendingFriends.delete(id);
            friendRequest.status = 'DECLINED';
            this.Client.emit('friend:request:decline', friendRequest);
            this.Client.emit(`friend#${id}:request:decline`, friendRequest);
          } else {
            const friend = this.Client.friends.get(id);
            this.Client.friends.delete(id);
            friend.status = 'REMOVED';
            this.Client.emit('friend:removed', friend);
            this.Client.emit(`friend#${id}:removed`, friend);
          }
        } break;

        case 'USER_BLOCKLIST_UPDATE': {
          const { status } = body;
          const id = body.accountId;
          if (status === 'BLOCKED') {
            const friend = this.Client.friends.get(id);
            friend.status = 'BLOCKED';
            this.Client.blockedFriends.set(id, friend);
            this.Client.friends.delete(id);
          } else if (status === 'UNBLOCKED') {
            const friend = this.Client.blockedFriends.get(id);
            friend.status = 'FRIENDED';
            this.Client.friends.set(id, friend);
            this.Client.blockedFriends.delete(id);
          }
        } break;

        case 'com.epicgames.social.party.notification.v0.PING': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN': break;

        case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION': break;

        case 'com.epicgames.social.party.notification.v0.INVITE_DECLINED': break;

        default: this.Client.debug(`New Unknown XMPP message: ${JSON.stringify(m)}`); break;
      }
    });
  }

  sendStatus(status, to = null) {
    if (!status) this.stream.sendPresence(null);
    if (to) {
      return this.stream.sendPresence({
        status: JSON.stringify(typeof status === 'object' ? status : { Status: status }),
        to,
      });
    }
    return this.stream.sendPresence({
      status: JSON.stringify(typeof status === 'object' ? status : { Status: status }),
    });
  }
}

module.exports = XMPP;
