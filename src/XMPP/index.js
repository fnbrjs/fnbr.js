/* eslint-disable max-len */
const { createClient } = require('stanza');
const UUID = require('uuid/v4');
const Endpoints = require('../../resources/Endpoints');
const FriendMessage = require('../Structures/FriendMessage');
const FriendPresence = require('../Structures/FriendPresence');
const Friend = require('../Structures/Friend');
const PendingFriend = require('../Structures/PendingFriend');
const PartyMember = require('../Structures/PartyMember');
const ClientPartyMember = require('../Structures/ClientPartyMember');

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
      interval: 30,
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

    this.stream.on('presence', async (p) => {
      if (p.type === 'unavailable') return;
      const fromId = p.from.split('@')[0];
      if (fromId === this.Client.account.id) {
        this.stream.emit(`presence#${p.id}:sent`);
        return;
      }
      if (this.Client.pendingFriends.get(fromId) && !this.Client.friends.get(fromId)) await this.Client.waitForEvent(`friend#${fromId}:added`);
      const friendPresence = new FriendPresence(this.Client, JSON.parse(p.status), fromId);
      this.Client.friends.get(fromId).presence = friendPresence;
      this.Client.emit('friend:presence', friendPresence);
      this.Client.emit(`friend#${fromId}:presence`, friendPresence);
    });

    this.stream.on('chat', (c) => {
      const message = new FriendMessage(this.Client, c);
      this.Client.emit('friend:message', message);
      this.Client.emit(`friend#${c.from.split('@')[0]}:message`, message);
    });

    this.stream.on('message', async (m) => {
      if (m.type === 'chat' || m.type === 'error' || m.type === 'headline' || m.type === 'groupchat') return;
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
            if (this.Client.pendingFriends.some((f) => f.id === id)) {
              this.Client.pendingFriends.delete(id);
            }
            this.Client.emit('friend:added', friend);
            this.Client.emit(`friend#${id}:added`, friend);
          } else if (status === 'PENDING') {
            const friendRequest = new PendingFriend(this.Client, { ...user, direction: (payload.direction === 'INBOUND') ? 'INCOMING' : 'OUTGOING' });
            this.Client.pendingFriends.set(user.id, friendRequest);
            if (payload.direction === 'INBOUND') {
              this.Client.emit('friend:request', friendRequest);
              this.Client.emit(`friend#${id}:request`, friendRequest);
            } else {
              this.Client.emit('friend:request:sent', friendRequest);
              this.Client.emit(`friend#${id}:request:sent`, friendRequest);
            }
          }
        } break;

        case 'FRIENDSHIP_REMOVE': {
          await this.Client.waitUntilReady();
          const { reason } = body;
          const id = (body.from === this.Client.account.id) ? body.to : body.from;
          if (reason === 'ABORTED') {
            const friendRequest = this.Client.pendingFriends.get(id);
            this.Client.pendingFriends.delete(id);
            friendRequest.status = 'ABORTED';
            this.Client.emit('friend:request:aborted', friendRequest);
            this.Client.emit(`friend#${id}:request:aborted`, friendRequest);
          } else if (reason === 'REJECTED') {
            const friendRequest = this.Client.pendingFriends.get(id);
            this.Client.pendingFriends.delete(id);
            friendRequest.status = 'REJECTED';
            this.Client.emit('friend:request:rejected', friendRequest);
            this.Client.emit(`friend#${id}:request:rejected`, friendRequest);
          } else {
            const friend = this.Client.friends.get(id);
            this.Client.friends.delete(id);
            friend.status = 'REMOVED';
            this.Client.emit('friend:removed', friend);
            this.Client.emit(`friend#${id}:removed`, friend);
          }
        } break;

        case 'USER_BLOCKLIST_UPDATE': {
          await this.Client.waitUntilReady();
          const { status } = body;
          const id = body.accountId;
          if (status === 'BLOCKED') {
            const friend = this.Client.friends.get(id);
            friend.status = 'BLOCKED';
            this.Client.blockedFriends.set(id, friend);
            this.Client.friends.delete(id);
            this.Client.emit('friend:blocked', friend);
            this.Client.emit(`friend#${id}:blocked`, friend);
          } else if (status === 'UNBLOCKED') {
            const friend = this.Client.blockedFriends.get(id);
            friend.status = 'FRIENDED';
            this.Client.friends.set(id, friend);
            this.Client.blockedFriends.delete(id);
            this.Client.emit('friend:unblocked', friend);
            this.Client.emit(`friend#${id}:unblocked`, friend);
          }
        } break;

        case 'com.epicgames.social.party.notification.v0.PING': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': {
          const accountId = body.account_id;
          await this.Client.waitUntilReady();
          if (accountId === this.Client.account.id) {
            await this.Client.partyJoinLock.await();
            await XMPP.sleep(1000);
          }
          if (!this.Client.party) break;
          if (accountId === this.Client.account.id) {
            if (!this.Client.party.members.has(this.Client.account.id)) this.Client.party.members.set(accountId, new ClientPartyMember(this.Client.party, body));
            this.Client.party.me.sendPatch();
          } else this.Client.party.members.set(accountId, new PartyMember(this.Client.party, body));
          const partyMember = this.Client.party.members.get(accountId);
          this.Client.party.patchPresence();
          console.log(`patch by ${accountId}`);
          if (this.Client.party.me.isLeader) this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:joined', partyMember);
          this.Client.emit(`party:member#${accountId}:joined`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
          if (!this.Client.party || !this.Client.party.id === body.party_id) break;
          const accountId = body.account_id;
          const partyMember = this.Client.party.members.get(accountId);
          partyMember.update(body);
          this.Client.emit('party:member:updated', partyMember);
          this.Client.emit(`party:member#${accountId}:updated`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': {
          if (!this.Client.party || !this.Client.party.id === body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.Client.account.id) break;
          const partyMember = this.Client.party.members.delete(accountId);
          this.Client.party.patchPresence();
          if (this.Client.party.me.isLeader) this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:left', partyMember);
          this.Client.emit(`party:member#${accountId}:left`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED': break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN': {
          if (!this.Client.party || !this.Client.party.id === body.party_id) break;
          const member = this.Client.party.members.get(body.account_id);
          if (!member) break;
          this.Client.party.members.forEach((mem) => mem.role === '');
          this.Client.party.members.set(member.id, { ...member, role: 'CAPTAIN' });
          this.Client.party.patchPresence();

          this.Client.emit('party:member:promoted', member);
          this.Client.emit(`party:member#${member.id}:promoted`, member);
        } break;

        case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED':
          this.Client.party.update(body);
          this.Client.party.patchPresence();
          this.Client.emit('party:updated', this.Client.party);
          break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION':
          if (this.Client.party.me.isLeader) {
            this.Client.Http.send(true, 'POST',
              `${Endpoints.BR_PARTY}/parties/${this.Client.party.id}/members/${body.account_id}/confirm`, `bearer ${this.Client.Auth.auths.token}`);
          }
          break;

        case 'com.epicgames.social.party.notification.v0.INVITE_DECLINED': break;

        default: if (this.Client.config.xmppDebug) this.Client.debug(`New Unknown XMPP message: ${JSON.stringify(m)}`); break;
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

  static sleep(timeout) {
    return new Promise((res) => setTimeout(() => res(), timeout));
  }
}

module.exports = XMPP;
