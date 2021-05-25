/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
const { createClient } = require('stanza');
const crypto = require('crypto');
const Base = require('./Base');
const Endpoints = require('../../resources/Endpoints');
const FriendMessage = require('../structs/FriendMessage');
const FriendPresence = require('../structs/FriendPresence');
const Friend = require('../structs/Friend');
const PendingFriend = require('../structs/PendingFriend');
const PartyMember = require('../structs/PartyMember');
const PartyMessage = require('../structs/PartyMessage');
const ClientPartyMember = require('../structs/ClientPartyMember');
const PartyInvitation = require('../structs/PartyInvitation');
const Party = require('../structs/Party');

/**
 * Represents the XMPP manager of a client
 * @extends {Base}
 * @private
 */
class XMPP extends Base {
  /**
   * @param {Object} client The main client
   */
  constructor(client) {
    super(client);

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
    this.uuid = crypto.randomBytes(16).toString('hex').toUpperCase();

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

    /**
     *
     * The ping interval to prevent the client from disconnecting
     * @type {Number}
     * @private
     */
    this.PingIntervalId;
  }

  /**
   * Setups the XMPP stream and events
   * @returns {void}
   */
  setup() {
    this.resource = `V2:Fortnite:${this.client.config.platform}::${this.uuid}`;
    this.stream = createClient({
      wsURL: `wss://${Endpoints.XMPP_SERVER}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        jid: `${this.client.user.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.client.user.id,
        password: this.client.auth.auths.get('fortnite').token,
      },
      resource: this.resource,
    });

    this.stream.enableKeepAlive({
      interval: this.client.config.keepAliveInterval,
    });

    this.setupEvents();

    this.PingIntervalId = setInterval(() => {
      if (this.connected) {
        this.stream.ping();
      }
      else {
        clearInterval(this.PingIntervalId)
      }
    }, 30000); // 30 secondes
  }

  /**
   * Connects the XMPP client to Epic Games' services
   * @param {boolean} isReconnect Whether this is a reconnection or not
   * @returns {Promise<Object>}
   */
  connect(isReconnect = false) {
    if (!isReconnect) this.client.debug('XMPP-Client connecting...');
    else this.client.debug('XMPP-Client reconnecting...');
    const startConnect = new Date().getTime();
    this.stream.connect();

    return new Promise((res) => {
      const failTimeout = setTimeout(() => {
        this.client.debug('XMPP-Client reconnection failed: Timeout of 15000ms exceed');
        res({ success: false, response: 'connection timeout of 15000ms exceed' });
      }, 15000);
      this.stream.once('session:started', async () => {
        clearTimeout(failTimeout);
        this.connected = true;
        this.sendStatus(this.client.config.status || 'Playing Battle Royale');
        if (!isReconnect) this.client.debug(`XMPP-Client successfully connected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
        else {
          this.client.debug(`XMPP-Client successfully reconnected (${((Date.now() - startConnect) / 1000).toFixed(2)}s)`);
          if (this.client.party) {
            await this.client.initParty();
            await this.client.party.patchPresence();
          }
        }
        res({ success: true });
      });
      this.stream.once('stream:error', (err) => {
        clearTimeout(failTimeout);
        this.client.debug(`XMPP-Client reconnection failed: ${this.client.parseError(err)}`);
        res({ success: false, response: err });
      });
    });
  }

  /**
   * Disconnects the XMPP client
   * @returns {Promise<Object>}
   */
  disconnect() {
    this.client.debug('XMPP-Client disconnecting...');
    const startDisconnect = new Date().getTime();
    this.stream.disconnect();
    this.connected = false;
    return new Promise((res) => {
      this.stream.once('disconnected', () => {
        this.client.debug(`XMPP-Client successfully disconnected (${((Date.now() - startDisconnect) / 1000).toFixed(2)}s)`);
        res({ success: true });
      });
      setTimeout(() => {
        this.client.debug(`XMPP-Client successfully disconnected (${((Date.now() - startDisconnect) / 1000).toFixed(2)}s)`);
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

    this.uuid = crypto.randomBytes(16).toString('hex').toUpperCase();
    this.resource = `V2:Fortnite:${this.client.config.platform}::${this.uuid}`;

    this.stream.config = {
      ...this.stream.config,
      resource: this.resource,
      credentials: {
        jid: `${this.client.user.id}@${Endpoints.EPIC_PROD_ENV}`,
        host: Endpoints.EPIC_PROD_ENV,
        username: this.client.user.id,
        password: this.client.auth.auths.get('fortnite').token,
      },
    };

    this.client.isReady = false;
    const reconnect = await this.connect(true);
    this.client.isReady = true;

    this.PingIntervalId = setInterval(() => {
      if (this.connected) {
        this.stream.ping();
      }
      else {
        clearInterval(this.PingIntervalId)
      }
    }, 30000); // 30 secondes

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
        this.client.isReady = false;
        const { success } = await this.reconnect();
        if (success) this.client.isReady = true;
        await this.client.updateCache();
      }
    });

    this.stream.on('raw:incoming', (raw) => {
      if (this.client.config.xmppDebug) this.client.debug(`IN ${raw}`);
    });

    this.stream.on('raw:outgoing', (raw) => {
      if (this.client.config.xmppDebug) this.client.debug(`OUT ${raw}`);
    });

    this.stream.on('message:sent', (m) => {
      setTimeout(() => this.stream.emit(`message#${m.id}:sent`), 200);
    });

    this.stream.on('groupchat', async (g) => {
      if (!this.client.party || this.client.party.id !== g.from.split('@')[0].replace('Party-', '')) return;
      if (g.body === 'Welcome! You created new Multi User Chat Room.') return;
      const [, id] = g.from.split(':');
      if (id === this.client.user.id) return;
      const member = this.client.party.members.get(id);
      if (!member) return;

      const partyMessage = new PartyMessage(this.client, { body: g.body, author: member, chat: this.client.party.chat });
      this.client.emit('party:member:message', partyMessage);
      this.client.emit(`party:member#${id}:message`, partyMessage);
    });

    this.stream.on('presence', async (p) => {
      await this.client.waitUntilReady();
      if (p.type === 'unavailable' || !p.status) return;
      const fromId = p.from.split('@')[0];
      if (fromId === this.client.user.id) {
        this.stream.emit(`presence#${p.id}:sent`);
        return;
      }
      try {
        if (!this.client.friends.cache.has(fromId)) await this.client.waitForEvent(`friend#${fromId}:added`);
      } catch (err) {
        return;
      }
      const before = this.client.friends.cache.get(fromId).presence;
      const after = new FriendPresence(this.client, JSON.parse(p.status), fromId);
      if (this.client.config.cachePresences) this.client.friends.cache.get(fromId).presence = after;
      this.client.emit('friend:presence', before, after);
      this.client.emit(`friend#${fromId}:presence`, before, after);
    });

    this.stream.on('chat', (c) => {
      const message = new FriendMessage(this.client, c);
      this.client.emit('friend:message', message);
      this.client.emit(`friend#${c.from.split('@')[0]}:message`, message);
    });

    this.stream.on('message', async (m) => {
      if (m.type === 'chat' || m.type === 'error' || m.type === 'headline' || m.type === 'groupchat') return;
      const body = JSON.parse(m.body);
      if (!body.type) return;
      switch (body.type) {
        case 'com.epicgames.friends.core.apiobjects.Friend': {
          await this.client.waitUntilReady();
          const { payload } = body;
          const { status, accountId } = payload;
          const user = await this.client.getProfile(accountId);
          if (!user) break;
          if (status === 'ACCEPTED') {
            const friend = new Friend(this.client, {
              ...user, favorite: payload.favorite, created: body.timestamp || Date.now(),
            });
            this.client.friends.add(friend);
            this.client.friends.pending.cache.delete(accountId);
            this.client.emit('friend:added', friend);
            this.client.emit(`friend#${accountId}:added`, friend);
          } else if (status === 'PENDING') {
            const friendRequest = new PendingFriend(this.client, { ...user, direction: payload.direction === 'INBOUND' ? 'INCOMING' : 'OUTGOING' });
            this.client.friends.pending.add(friendRequest);
            if (payload.direction === 'INBOUND') {
              this.client.emit('friend:request', friendRequest);
              this.client.emit(`friend#${accountId}:request`, friendRequest);
            } else {
              this.client.emit('friend:request:sent', friendRequest);
              this.client.emit(`friend#${accountId}:request:sent`, friendRequest);
            }
          }
        } break;

        case 'FRIENDSHIP_REMOVE': {
          await this.client.waitUntilReady();
          const { reason, from, to } = body;
          const accountId = from === this.client.user.id ? to : from;
          if (reason === 'ABORTED' || reason === 'REJECTED') {
            let friendRequest = this.client.friends.pending.cache.get(accountId);
            if (!friendRequest) {
              const user = await this.client.getProfile(accountId);
              if (!user) break;
              friendRequest = new PendingFriend(this.client, { ...user, direction: reason === 'ABORTED' ? 'OUTGOING' : 'INCOMING' });
            } else this.client.friends.pending.cache.delete(accountId);
            this.client.emit(`friend:request:${reason.toLowerCase()}`, friendRequest);
            this.client.emit(`friend#${accountId}:request:${reason.toLowerCase()}`, friendRequest);
          } else if (reason === 'REJECTED') {
            const friendRequest = this.client.friends.pending.cache.get(accountId);
            this.client.friends.pending.cache.delete(accountId);
            this.client.emit('friend:request:rejected', friendRequest);
            this.client.emit(`friend#${accountId}:request:rejected`, friendRequest);
          } else {
            let friend = this.client.friends.cache.get(accountId);
            if (!friend) {
              const user = await this.client.getProfile(accountId);
              if (!user) break;
              friend = new Friend(this.client, user);
            } else this.client.friends.cache.delete(accountId);
            this.client.emit('friend:removed', friend);
            this.client.emit(`friend#${accountId}:removed`, friend);
          }
        } break;

        case 'USER_BLOCKLIST_UPDATE': {
          await this.client.waitUntilReady();
          const { status, accountId } = body;
          if (status === 'BLOCKED') {
            const friend = this.client.friends.cache.get(accountId);
            if (!friend) break;
            friend.status = 'BLOCKED';
            this.client.friends.blocked.add(friend);
            this.client.friends.cache.delete(accountId);
            this.client.emit('friend:blocked', friend);
            this.client.emit(`friend#${accountId}:blocked`, friend);
          } else if (status === 'UNBLOCKED') {
            const friend = this.client.friends.blocked.cache.get(accountId);
            if (!friend) break;
            friend.status = 'FRIENDED';
            this.client.friends.add(friend);
            this.client.friends.blocked.cache.delete(accountId);
            this.client.emit('friend:unblocked', friend);
            this.client.emit(`friend#${accountId}:unblocked`, friend);
          }
        } break;

        case 'com.epicgames.social.party.notification.v0.PING': {
          const pingerId = body.pinger_id;
          let data = await this.client.http.send(true, 'GET',
            `${Endpoints.BR_PARTY}/user/${this.client.user.id}/pings/${pingerId}/parties`, 'fortnite');
          if (!data.success) {
            this.client.debug(`Failed fetching invite from ${pingerId}: ${this.client.parseError(data.response)}`);
            break;
          }
          if (!data.response[0]) {
            this.client.debug(`Failed fetching invite from ${pingerId}: No invite found`);
            break;
          }
          if (this.kickedPartyIds.some((i) => i === data.response[0].id)) {
            this.client.debug(`Failed fetching invite from ${pingerId}: The client previously got kicked from this party`);
            break;
          }
          [data] = data.response;
          let party;
          if (data.config.discoverability === 'ALL') party = await Party.Lookup(this.client, data.id);
          else party = new Party(this.client, data);
          let invite;
          for (const inv of data.invites) {
            if (inv.sent_by === pingerId && inv.status === 'SENT') {
              invite = inv;
              break;
            }
          }
          if (!invite) invite = PartyInvitation.createInvite(this.client, pingerId, { ...body, ...data });
          const invitation = new PartyInvitation(this.client, party, invite);
          this.client.emit('party:invite', invitation);
          this.client.emit(`party#${party.id}:invite`, invitation);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': {
          await this.client.partyLock.wait();
          const accountId = body.account_id;
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          if (accountId === this.client.user.id) {
            if (!this.client.party.me) this.client.party.members.set(accountId, new ClientPartyMember(this.client.party, body));
            await this.client.party.me.sendPatch();
          } else this.client.party.members.set(accountId, new PartyMember(this.client.party, body));
          const partyMember = this.client.party.members.get(accountId);
          if (!partyMember.displayName) await partyMember.fetch();
          this.client.party.patchPresence();
          if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();
          this.client.emit('party:member:joined', partyMember);
          this.client.emit(`party:member#${accountId}:joined`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          const partyMember = this.client.party.members.get(accountId);
          if (!partyMember) break;
          partyMember.update(body);
          this.client.emit('party:member:updated', partyMember);
          this.client.emit(`party:member#${accountId}:updated`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': {
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.client.user.id) break;
          const partyMember = this.client.party.members.get(accountId);
          if (!partyMember) break;
          this.client.party.members.delete(accountId);
          this.client.party.patchPresence();
          if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();
          this.client.emit('party:member:left', partyMember);
          this.client.emit(`party:member#${accountId}:left`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': {
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.client.user.id) break;
          const partyMember = this.client.party.members.get(accountId);
          if (!partyMember) break;
          this.client.party.members.delete(accountId);
          this.client.party.patchPresence();
          if (this.client.party.me.isLeader) this.client.party.refreshSquadAssignments();
          this.client.emit('party:member:expired', partyMember);
          this.client.emit(`party:member#${accountId}:expired`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': {
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          const partyMember = this.client.party.members.get(accountId);
          if (accountId === this.client.user.id) {
            this.kickedPartyIds.push(body.party_id);
            this.client.party = undefined;
            await this.client.initParty();
          } else {
            if (!partyMember) break;
            this.client.party.members.delete(accountId);
            this.client.party.patchPresence();
            if (this.client.party.me.isLeader) this.client.party.refreshSquadAssignments();
          }
          this.client.emit('party:member:kicked', partyMember);
          this.client.emit(`party:member#${accountId}:kicked`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED': {
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          const accountId = body.account_id;
          if (accountId === this.client.user.id) break;
          const partyMember = this.client.party.members.get(accountId);
          if (!partyMember) break;
          this.client.party.members.delete(accountId);
          this.client.party.patchPresence();
          if (this.client.party.me.isLeader) this.client.party.refreshSquadAssignments();
          this.client.emit('party:member:disconnected', partyMember);
          this.client.emit(`party:member#${accountId}:disconnected`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN': {
          await this.client.partyLock.wait();
          if (!this.client.party || !this.client.party.leader || this.client.party.id !== body.party_id) break;
          this.client.party.leader.role = '';
          this.client.party.patchAssignmentsLocked = false;
          const partyMember = this.client.party.members.get(body.account_id);
          if (!partyMember) break;
          this.client.party.members.get(body.account_id).role = 'CAPTAIN';
          this.client.party.patchPresence();

          this.client.emit('party:member:promoted', partyMember);
          this.client.emit(`party:member#${body.account_id}:promoted`, partyMember);
        } break;

        case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED':
          await this.client.partyLock.wait();
          if (!this.client.party || this.client.party.id !== body.party_id) break;
          this.client.party.update(body);
          this.client.party.patchPresence();
          this.client.emit('party:updated', this.client.party);
          break;

        case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION':
          if (this.client.party.me.isLeader) {
            this.client.http.send(true, 'POST',
              `${Endpoints.BR_PARTY}/parties/${this.client.party.id}/members/${body.account_id}/confirm`, 'fortnite');
          }
          break;

        case 'com.epicgames.social.party.notification.v0.INVITE_DECLINED': {
          const friend = this.client.friends.cache.get(body.invitee_id);
          if (!friend) return;
          this.client.emit('party:invite:declined', friend);
          this.client.emit(`party#${body.party_id}:invite:declined`, friend);
        } break;

        default: if (this.client.config.xmppDebug) this.client.debug(`New Unknown XMPP message: ${JSON.stringify(m)}`); break;
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
