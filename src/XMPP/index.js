/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
const { createClient } = require('stanza');
const UUID = require('uuid/v4');
const Endpoints = require('../../resources/Endpoints');
const FriendMessage = require('../Structures/FriendMessage');
const FriendPresence = require('../Structures/FriendPresence');
const Friend = require('../Structures/Friend');
const PendingFriend = require('../Structures/PendingFriend');
const PartyMember = require('../Structures/PartyMember');
const PartyMessage = require('../Structures/PartyMessage');
const ClientPartyMember = require('../Structures/ClientPartyMember');
const PartyInvitation = require('../Structures/PartyInvitation');
const Party = require('../Structures/Party');

/**
 * Represents the XMPP manager of a client
 * @private
 */
class XMPP {
  /**
   * @param {Object} client The main client
   */
  constructor(client) {
    /**
     * The main client
     * @type {Client}
     */
    this.Client = client;

    /**
     * The XMPP connection stream
     * @type {?Agent}
     */
    this.stream = undefined;

    /**
     * Whether the XMPP client is connected or not
     * @type {boolean}
     */
    this.connected = false;

    /**
     * Whether the XMPP client is reconnecting or not
     * @type {boolean}
     */
    this.isReconnecting = false;

    /**
     * The XMPP client's UUID
     * @type {string}
     */
    this.uuid = UUID().replace(/-/g, '').toUpperCase();

    /**
     * The XMPP client's resource
     * @type {?string}
     */
    this.resource = undefined;

    /**
     * This stores the parties which the client got kicked from
     * You can't accept an invite of a party you got kicked from
     * @type {Array}
     */
    this.kickedPartyIds = [];
  }

  /**
   * Setups the XMPP stream and events
   * @returns {void}
   */
  setup() {
    this.resource = `V2:Fortnite:${this.Client.config.platform}::${this.uuid}`;
    this.stream = createClient({
      wsURL: `wss://${Endpoints.XMPP_SERVER}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        jid: `${this.Client.user.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.Client.user.id,
        password: this.Client.Auth.auths.token,
      },
      resource: this.resource,
    });

    this.stream.enableKeepAlive({
      interval: this.Client.config.keepAliveInterval,
    });

    this.setupEvents();
  }

  /**
   * Connects the XMPP client to Epic Games' services
   * @param {boolean} isReconnect Whether this is a reconnection or not
   * @returns {Promise<Object>}
   */
  connect(isReconnect = false) {
    if (!isReconnect) this.Client.debug('XMPP-Client connecting...');
    else this.Client.debug('XMPP-Client reconnecting...');
    const startConnect = new Date().getTime();
    this.stream.connect();

    return new Promise((res) => {
      const failTimeout = setTimeout(() => {
        this.Client.debug('XMPP-Client reconnection failed: Timeout of 15000ms exceed');
        res({ success: false, response: 'connection timeout of 15000ms exceed' });
      }, 15000);
      this.stream.once('session:started', async () => {
        clearTimeout(failTimeout);
        this.connected = true;
        this.sendStatus(this.Client.config.status || 'Playing Battle Royale');
        if (!isReconnect) this.Client.debug(`XMPP-Client successfully connected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
        else {
          this.Client.debug(`XMPP-Client successfully reconnected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
          if (this.Client.party) {
            await this.Client.initParty();
            await this.Client.party.patchPresence();
          }
        }
        res({ success: true });
      });
      this.stream.once('stream:error', (err) => {
        clearTimeout(failTimeout);
        this.Client.debug(`XMPP-Client reconnection failed: ${this.Client.parseError(err)}`);
        res({ success: false, response: err });
      });
    });
  }

  /**
   * Disconnects the XMPP client
   * @returns {Promise<Object>}
   */
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
      setTimeout(() => {
        this.Client.debug(`XMPP-Client successfully disconnected (${((Date.now() - startDisconnect) / 1000).toFixed(2)}s)`);
        res({ success: true });
      }, 4000);
    });
  }

  /**
   * Reconnects the XMPP client
   * @returns {Promise<Object>}
   */
  async reconnect() {
    if (this.isReconnecting) return { success: true };
    this.isReconnecting = true;
    if (this.connected) await this.disconnect();

    this.uuid = UUID().replace(/-/g, '').toUpperCase();
    this.resource = `V2:Fortnite:${this.Client.config.platform}::${this.uuid}`;

    this.stream.config = {
      ...this.stream.config,
      resource: this.resource,
      credentials: {
        jid: `${this.Client.user.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.Client.user.id,
        password: this.Client.Auth.auths.token,
      },
    };

    this.Client.isReady = false;
    const reconnect = await this.connect(true);
    this.Client.isReady = true;
    if (!reconnect.success) return reconnect;
    this.isReconnecting = false;
    return { success: true };
  }

  /**
   * Setups the XMPP events
   * @returns {void}
   */
  setupEvents() {
    this.stream.on('disconnected', async () => {
      if (this.connected) {
        this.connected = false;
        this.Client.isReady = false;
        const { success } = await this.reconnect();
        if (success) this.Client.isReady = true;
        await this.Client.updateCache();
      }
    });

    this.stream.on('raw:incoming', (raw) => {
      if (this.Client.config.xmppDebug) this.Client.debug(`IN ${raw}`);
    });

    this.stream.on('raw:outgoing', (raw) => {
      if (this.Client.config.xmppDebug) this.Client.debug(`OUT ${raw}`);
    });

    this.stream.on('message:sent', (m) => {
      setTimeout(() => this.stream.emit(`message#${m.id}:sent`), 200);
    });

    this.stream.on('groupchat', async (g) => {
      if (!this.Client.party || this.Client.party.id !== g.from.split('@')[0].replace('Party-', '')) return;
      if (g.body === 'Welcome! You created new Multi User Chat Room.') return;
      const [, id] = g.from.split(':');
      if (id === this.Client.user.id) return;
      const member = this.Client.party.members.get(id);
      if (!member) return;

      const partyMessage = new PartyMessage(this.Client, { body: g.body, author: member, chat: this.Client.party.chat });
      this.Client.emit('party:member:message', partyMessage);
      this.Client.emit(`party:member#${id}:message`, partyMessage);
    });

    this.stream.on('presence', async (p) => {
      await this.Client.waitUntilReady();
      if (p.type === 'unavailable' || !p.status) return;
      const fromId = p.from.split('@')[0];
      if (fromId === this.Client.user.id) {
        this.stream.emit(`presence#${p.id}:sent`);
        return;
      }
      try {
        if (!this.Client.friends.has(fromId)) await this.Client.waitForEvent(`friend#${fromId}:added`);
      } catch (err) {
        return;
      }
      const before = this.Client.friends.get(fromId).presence;
      const after = new FriendPresence(this.Client, JSON.parse(p.status), fromId);
      if (this.Client.config.cachePresences) this.Client.friends.get(fromId).presence = after;
      this.Client.emit('friend:presence', before, after);
      this.Client.emit(`friend#${fromId}:presence`, before, after);
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
          const { status, accountId } = payload;
          const user = await this.Client.getProfile(accountId);
          if (!user) break;
          if (status === 'ACCEPTED') {
            const friend = new Friend(this.Client, {
              ...user, favorite: payload.favorite, created: body.timestamp || Date.now(),
            });
            this.Client.friends.set(friend.id, friend);
            if (this.Client.pendingFriends.some((f) => f.id === accountId)) {
              this.Client.pendingFriends.delete(accountId);
            }
            this.Client.emit('friend:added', friend);
            this.Client.emit(`friend#${accountId}:added`, friend);
          } else if (status === 'PENDING') {
            const friendRequest = new PendingFriend(this.Client, { ...user, direction: payload.direction === 'INBOUND' ? 'INCOMING' : 'OUTGOING' });
            this.Client.pendingFriends.set(friendRequest.id, friendRequest);
            if (payload.direction === 'INBOUND') {
              this.Client.emit('friend:request', friendRequest);
              this.Client.emit(`friend#${accountId}:request`, friendRequest);
            } else {
              this.Client.emit('friend:request:sent', friendRequest);
              this.Client.emit(`friend#${accountId}:request:sent`, friendRequest);
            }
          }
        } break;

        case 'FRIENDSHIP_REMOVE': {
          await this.Client.waitUntilReady();
          const { reason, from, to } = body;
          const accountId = from === this.Client.user.id ? to : from;
          if (reason === 'ABORTED' || reason === 'REJECTED') {
            let friendRequest = this.Client.pendingFriends.get(accountId);
            if (!friendRequest) {
              const user = await this.Client.getProfile(accountId);
              if (!user) break;
              friendRequest = new PendingFriend(this.Client, { ...user, direction: reason === 'ABORTED' ? 'OUTGOING' : 'INCOMING' });
            } else this.Client.pendingFriends.delete(accountId);
            this.Client.emit(`friend:request:${reason.toLowerCase()}`, friendRequest);
            this.Client.emit(`friend#${accountId}:request:${reason.toLowerCase()}`, friendRequest);
          } else if (reason === 'REJECTED') {
            const friendRequest = this.Client.pendingFriends.get(accountId);
            this.Client.pendingFriends.delete(accountId);
            this.Client.emit('friend:request:rejected', friendRequest);
            this.Client.emit(`friend#${accountId}:request:rejected`, friendRequest);
          } else {
            let friend = this.Client.friends.get(accountId);
            if (!friend) {
              const user = await this.Client.getProfile(accountId);
              if (!user) break;
              friend = new Friend(this.Client, user);
            } else this.Client.friends.delete(accountId);
            this.Client.emit('friend:removed', friend);
            this.Client.emit(`friend#${accountId}:removed`, friend);
          }
        } break;

        case 'USER_BLOCKLIST_UPDATE': {
          await this.Client.waitUntilReady();
          const { status, accountId } = body;
          if (status === 'BLOCKED') {
            const friend = this.Client.friends.get(accountId);
            if (!friend) break;
            friend.status = 'BLOCKED';
            this.Client.blockedFriends.set(accountId, friend);
            this.Client.friends.delete(accountId);
            this.Client.emit('friend:blocked', friend);
            this.Client.emit(`friend#${accountId}:blocked`, friend);
          } else if (status === 'UNBLOCKED') {
            const friend = this.Client.blockedFriends.get(accountId);
            if (!friend) break;
            friend.status = 'FRIENDED';
            this.Client.friends.set(accountId, friend);
            this.Client.blockedFriends.delete(accountId);
            this.Client.emit('friend:unblocked', friend);
            this.Client.emit(`friend#${accountId}:unblocked`, friend);
          }
        } break;

        case 'com.epicgames.social.party.notification.v0.PING': {
          const pingerId = body.pinger_id;
          let data = await this.Client.Http.send(true, 'GET',
            `${Endpoints.BR_PARTY}/user/${this.Client.user.id}/pings/${pingerId}/parties`, `bearer ${this.Client.Auth.auths.token}`);
          if (!data.success) {
            this.Client.debug(`Failed fetching invite from ${pingerId}: ${this.Client.parseError(data.response)}`);
            break;
          }
          if (!data.response[0]) {
            this.Client.debug(`Failed fetching invite from ${pingerId}: No invite found`);
            break;
          }
          if (this.kickedPartyIds.some((i) => i === data.response[0].id)) {
            this.Client.debug(`Failed fetching invite from ${pingerId}: The client previously got kicked from this party`);
            break;
          }
          [data] = data.response;
          let party;
          if (data.config.discoverability === 'ALL') party = await Party.Lookup(this.Client, data.id);
          else party = new Party(this.Client, data);
          let invite;
          for (const inv of data.invites) {
            if (inv.sent_by === pingerId && inv.status === 'SENT') {
              invite = inv;
              break;
            }
          }
          if (!invite) invite = PartyInvitation.createInvite(this.Client, pingerId, { ...body, ...data });
          const invitation = new PartyInvitation(this.Client, party, invite);
          this.Client.emit('party:invite', invitation);
          this.Client.emit(`party#${party.id}:invite`, invitation);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': {
          await this.Client.partyLock.wait();
          const accountId = body.account_id;
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          if (accountId === this.Client.user.id) {
            if (!this.Client.party.me) this.Client.party.members.set(accountId, new ClientPartyMember(this.Client.party, body));
            await this.Client.party.me.sendPatch();
          } else this.Client.party.members.set(accountId, new PartyMember(this.Client.party, body));
          const partyMember = this.Client.party.members.get(accountId);
          if (!partyMember.displayName) await partyMember.fetch();
          this.Client.party.patchPresence();
          if (this.Client.party.me.isLeader) await this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:joined', partyMember);
          this.Client.emit(`party:member#${accountId}:joined`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          const partyMember = this.Client.party.members.get(accountId);
          if (!partyMember) break;
          partyMember.update(body);
          this.Client.emit('party:member:updated', partyMember);
          this.Client.emit(`party:member#${accountId}:updated`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.Client.user.id) break;
          const partyMember = this.Client.party.members.get(accountId);
          if (!partyMember) break;
          this.Client.party.members.delete(accountId);
          this.Client.party.patchPresence();
          if (this.Client.party.me.isLeader) await this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:left', partyMember);
          this.Client.emit(`party:member#${accountId}:left`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.Client.user.id) break;
          const partyMember = this.Client.party.members.get(accountId);
          if (!partyMember) break;
          this.Client.party.members.delete(accountId);
          this.Client.party.patchPresence();
          if (this.Client.party.me.isLeader) this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:expired', partyMember);
          this.Client.emit(`party:member#${accountId}:expired`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          const partyMember = this.Client.party.members.get(accountId);
          if (accountId === this.Client.user.id) {
            this.kickedPartyIds.push(body.party_id);
            this.Client.party = undefined;
            await this.Client.initParty();
          } else {
            if (!partyMember) break;
            this.Client.party.members.delete(accountId);
            this.Client.party.patchPresence();
            if (this.Client.party.me.isLeader) this.Client.party.refreshSquadAssignments();
          }
          this.Client.emit('party:member:kicked', partyMember);
          this.Client.emit(`party:member#${accountId}:kicked`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.Client.user.id) break;
          const partyMember = this.Client.party.members.get(accountId);
          if (!partyMember) break;
          this.Client.party.members.delete(accountId);
          this.Client.party.patchPresence();
          if (this.Client.party.me.isLeader) this.Client.party.refreshSquadAssignments();
          this.Client.emit('party:member:disconnected', partyMember);
          this.Client.emit(`party:member#${accountId}:disconnected`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN': {
          await this.Client.partyLock.wait();
          if (!this.Client.party || !this.Client.party.leader || this.Client.party.id !== body.party_id) break;
          this.Client.party.leader.role = '';
          this.Client.party.patchAssignmentsLocked = false;
          const partyMember = this.Client.party.members.get(body.account_id);
          if (!partyMember) break;
          this.Client.party.members.get(body.account_id).role = 'CAPTAIN';
          this.Client.party.patchPresence();

          this.Client.emit('party:member:promoted', partyMember);
          this.Client.emit(`party:member#${body.account_id}:promoted`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED':
          await this.Client.partyLock.wait();
          if (!this.Client.party || this.Client.party.id !== body.party_id) break;
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

        case 'com.epicgames.social.party.notification.v0.INVITE_DECLINED': {
          const friend = this.Client.friends.get(body.invitee_id);
          if (!friend) return;
          this.Client.emit('party:invite:declined', friend);
          this.Client.emit(`party#${body.party_id}:invite:declined`, friend);
        } break;

        default: if (this.Client.config.xmppDebug) this.Client.debug(`New Unknown XMPP message: ${JSON.stringify(m)}`); break;
      }
    });
  }

  /**
   * Sends a presence status
   * @param {string} [status] The status message; can be null/undefined if you want to reset it
   * @param {string} [to] The XMPP address of the friend; can be undefined if you want to update the presence status for all friends
   * @returns {void}
   */
  sendStatus(status, to) {
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
