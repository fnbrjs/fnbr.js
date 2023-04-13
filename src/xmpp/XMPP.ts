import { createClient as createStanzaClient } from 'stanza';
import crypto from 'crypto';
import Base from '../Base';
import Endpoints from '../../resources/Endpoints';
import PartyMessage from '../structures/party/PartyMessage';
import FriendPresence from '../structures/friend/FriendPresence';
import Friend from '../structures/friend/Friend';
import IncomingPendingFriend from '../structures/friend/IncomingPendingFriend';
import OutgoingPendingFriend from '../structures/friend/OutgoingPendingFriend';
import BlockedUser from '../structures/user/BlockedUser';
import Party from '../structures/party/Party';
import { createPartyInvitation } from '../util/Util';
import ReceivedPartyInvitation from '../structures/party/ReceivedPartyInvitation';
import FriendNotFoundError from '../exceptions/FriendNotFoundError';
import ClientPartyMember from '../structures/party/ClientPartyMember';
import PartyMember from '../structures/party/PartyMember';
import PartyMemberNotFoundError from '../exceptions/PartyMemberNotFoundError';
import PartyMemberConfirmation from '../structures/party/PartyMemberConfirmation';
import ReceivedPartyJoinRequest from '../structures/party/ReceivedPartyJoinRequest';
import PresenceParty from '../structures/party/PresenceParty';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import PartyMemberMeta from '../structures/party/PartyMemberMeta';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import XMPPConnectionTimeoutError from '../exceptions/XMPPConnectionTimeoutError';
import XMPPConnectionError from '../exceptions/XMPPConnectionError';
import type { Stanzas, Agent, Constants } from 'stanza';
import type Client from '../Client';

/**
 * Represents the client's XMPP manager
 * @private
 */
class XMPP extends Base {
  /**
   * XMPP agent
   */
  private connection?: Agent;

  /**
   * The amount of times the XMPP agent has tried to reconnect
   */
  private connectionRetryCount: number;

  /**
   * The time the XMPP agent connected at
   */
  private connectedAt?: number;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.connection = undefined;
    this.connectedAt = undefined;
    this.connectionRetryCount = 0;
  }

  /**
   * Whether the XMPP agent is connected
   */
  public get isConnected() {
    return !!this.connection && this.connection.sessionStarted;
  }

  /**
   * Returns the xmpp JID
   */
  public get JID() {
    return this.connection?.jid;
  }

  /**
   * Returns the xmpp resource
   */
  public get resource() {
    return this.connection?.config.resource;
  }

  /**
   * Connects the XMPP agent to Epicgames' XMPP servers
   * @param sendStatusWhenConnected Whether to send an empty status status when connected
   */
  public async connect(sendStatusWhenConnected = true) {
    if (!this.client.auth.sessions.has(AuthSessionStoreKey.Fortnite)) {
      throw new AuthenticationMissingError(AuthSessionStoreKey.Fortnite);
    }

    this.connection = createStanzaClient({
      jid: `${this.client.user.self!.id}@${Endpoints.EPIC_PROD_ENV}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        host: Endpoints.EPIC_PROD_ENV,
        username: this.client.user.self!.id,
        password: this.client.auth.sessions.get(AuthSessionStoreKey.Fortnite)!.accessToken,
      },
      resource: `V2:Fortnite:${this.client.config.platform}::${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
    });

    this.connection.enableKeepAlive({
      interval: this.client.config.xmppKeepAliveInterval,
    });

    this.setupEvents();

    this.client.debug('[XMPP] Connecting...');
    const connectionStartTime = Date.now();

    return new Promise<void>((res, rej) => {
      const timeout = setTimeout(() => {
        rej(new XMPPConnectionTimeoutError(15000));
      }, 15000);

      this.connection!.once('session:started', () => {
        clearTimeout(timeout);
        this.client.debug(`[XMPP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);

        this.connectedAt = Date.now();

        if (sendStatusWhenConnected) this.sendStatus();

        res();
      });

      this.connection?.once('stream:error', (err) => {
        clearTimeout(timeout);
        rej(new XMPPConnectionError(err));
      });

      this.connection!.connect();
    });
  }

  /**
   * Disconnects the XMPP client.
   * Also performs a cleanup
   */
  public disconnect() {
    if (!this.connection) return;

    this.connection.removeAllListeners();
    this.connection.disconnect();
    this.connection = undefined;

    this.client.debug('[XMPP] Disconnected');
  }

  /**
   * Registers all events
   */
  private setupEvents() {
    this.connection!.on('disconnected', async () => {
      this.disconnect();

      if (this.connectionRetryCount >= this.client.config.xmppMaxConnectionRetries) {
        this.client.debug('[XMPP] Disconnected, reconnecting in 5 seconds...');
        this.connectionRetryCount += 1;

        await new Promise((res) => setTimeout(res, 5000));

        await this.connect();
        if (this.client.config.fetchFriends) await this.client.updateCaches();
        if (!this.client.config.disablePartyService) await this.client.initParty(this.client.config.createParty, this.client.config.forceNewParty);
      } else {
        this.client.debug('[XMPP] Disconnected, retry limit reached');

        await this.client.logout();
      }
    });

    this.connection!.on('raw:incoming', (raw) => this.client.debug(`IN ${raw}`, 'xmpp'));
    this.connection!.on('raw:outgoing', (raw) => this.client.debug(`OUT ${raw}`, 'xmpp'));

    this.connection!.on('groupchat', async (m) => {
      try {
        await this.client.partyLock.wait();

        const partyId = m.from.split('@')[0].replace('Party-', '');
        if (!this.client.party || this.client.party.id !== partyId) return;
        if (m.body === 'Welcome! You created new Multi User Chat Room.') return;

        const [, authorId] = m.from.split(':');
        if (authorId === this.client.user.self!.id) return;

        const authorMember = this.client.party.members.get(authorId);
        if (!authorMember) return;

        const partyMessage = new PartyMessage(this.client, {
          content: m.body ?? '', author: authorMember, sentAt: new Date(), id: m.id as string, party: this.client.party,
        });

        this.client.emit('party:member:message', partyMessage);
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing party chat message: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:chat:error', err);
      }
    });

    this.connection!.on('chat', async (m) => {
      try {
        const friend = await this.waitForFriend(m.from.split('@')[0]);
        if (!friend) return;
        const message = new ReceivedFriendMessage(this.client, {
          content: m.body || '', author: friend, id: m.id as string, sentAt: new Date(),
        });

        this.client.emit('friend:message', message);
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing friend whisper message: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:chat:error', err);
      }
    });

    this.connection!.on('presence', async (p) => {
      try {
        await this.client.cacheLock.wait();
        if (!p.status) return;

        const friendId = p.from.split('@')[0];
        if (friendId === this.client.user.self!.id) return;

        const friend = await this.waitForFriend(friendId);
        if (!friend) return;

        if (p.type === 'unavailable') {
          friend.lastAvailableTimestamp = undefined;
          friend.party = undefined;

          this.client.emit('friend:offline', friend);
          return;
        }

        const wasUnavailable = !friend.lastAvailableTimestamp;
        friend.lastAvailableTimestamp = Date.now();

        const presence = JSON.parse(p.status);

        const before = this.client.friend.list.get(friendId)?.presence;
        const after = new FriendPresence(this.client, presence, friend, p.show || 'online', p.from);
        if ((this.client.config.cacheSettings.presences?.maxLifetime || 0) > 0) {
          friend.presence = after;
        }

        if (presence.Properties?.['party.joininfodata.286331153_j']) {
          friend.party = new PresenceParty(this.client, presence.Properties['party.joininfodata.286331153_j']);
        }

        if (wasUnavailable && this.connectedAt && this.connectedAt > this.client.config.friendOnlineConnectionTimeout) {
          this.client.emit('friend:online', friend);
        }

        this.client.emit('friend:presence', before, after);
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing presence: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:presence:error', err);
      }
    });

    this.connection!.on('message', async (m) => {
      if (m.type && m.type !== 'normal') return;
      if (!m.body) return;
      if (m.from !== 'xmpp-admin@prod.ol.epicgames.com') return;

      let body: any;
      try {
        body = JSON.parse(m.body);
      } catch (err) {
        return;
      }

      if (!body.type) return;

      try {
        switch (body.type) {
          case 'com.epicgames.friends.core.apiobjects.Friend': {
            const {
              payload: {
                status, accountId, favorite, created, direction,
              },
            } = body;

            const user = await this.client.user.fetch(accountId);
            if (!user) break;

            if (status === 'ACCEPTED') {
              const friend = new Friend(this.client, {
                displayName: user.displayName,
                id: user.id,
                externalAuths: user.externalAuths,
                favorite,
                created,
                alias: '',
                note: '',
              });

              this.client.friend.list.set(friend.id, friend);
              this.client.friend.pendingList.delete(friend.id);

              this.client.emit('friend:added', friend);
            } else if (status === 'PENDING') {
              if (direction === 'INBOUND') {
                const pendingFriend = new IncomingPendingFriend(this.client, {
                  accountId: user.id,
                  // Type casting is fine here because the lookup by id always returns external auths
                  displayName: user.displayName as string,
                  created,
                  favorite,
                });

                this.client.friend.pendingList.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request', pendingFriend);
              } else if (direction === 'OUTBOUND') {
                const pendingFriend = new OutgoingPendingFriend(this.client, {
                  accountId: user.id,
                  // Type casting is fine here because the lookup by id always returns external auths
                  displayName: user.displayName as string,
                  created,
                  favorite,
                });

                this.client.friend.pendingList.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request:sent', pendingFriend);
              }
            }
          } break;

          case 'FRIENDSHIP_REMOVE': {
            const { from, to, reason } = body;
            const accountId = from === this.client.user.self!.id ? to : from;

            if (reason === 'ABORTED') {
              const pendingFriend = this.client.friend.pendingList.get(accountId);
              if (!pendingFriend) break;

              this.client.friend.pendingList.delete(pendingFriend.id);
              this.client.emit('friend:request:aborted', pendingFriend);
            } else if (reason === 'REJECTED') {
              const pendingFriend = this.client.friend.pendingList.get(accountId);
              if (!pendingFriend) break;

              this.client.friend.pendingList.delete(pendingFriend.id);
              this.client.emit('friend:request:declined', pendingFriend);
            } else if (reason === 'DELETED') {
              const friend = await this.waitForFriend(accountId);
              if (!friend) break;

              this.client.friend.list.delete(friend.id);
              this.client.emit('friend:removed', friend);
            }
          } break;

          case 'USER_BLOCKLIST_UPDATE': {
            const { status, accountId } = body;

            if (status === 'BLOCKED') {
              const user = await this.client.user.fetch(accountId);
              if (!user) break;

              const blockedUser = new BlockedUser(this.client, user);

              this.client.user.blocklist.set(user.id, blockedUser);
              this.client.emit('user:blocked', blockedUser);
            } else if (status === 'UNBLOCKED') {
              const blockedUser = this.client.user.blocklist.get(accountId);
              if (!blockedUser) break;

              this.client.user.blocklist.delete(blockedUser.id);
              this.client.emit('user:unblocked', blockedUser);
            }
          } break;

          case 'com.epicgames.social.party.notification.v0.PING': {
            if (this.client.config.disablePartyService) break;
            if (this.client.listenerCount('party:invite') === 0) break;

            const pingerId = body.pinger_id;

            const friend = await this.waitForFriend(pingerId);
            if (!friend) throw new FriendNotFoundError(pingerId);

            const data = await this.client.http.epicgamesRequest({
              method: 'GET',
              url: `${Endpoints.BR_PARTY}/user/${this.client.user.self!.id}/pings/${pingerId}/parties`,
            }, AuthSessionStoreKey.Fortnite);

            if (!data[0]) {
              this.client.debug(`[XMPP] Error while processing ${body.type}: Could't find an active invitation`);
              break;
            }

            const [partyData] = data;
            let party: Party;

            if (partyData.config.discoverability === 'ALL') party = await this.client.getParty(partyData.id) as Party;
            else party = new Party(this.client, partyData);

            if (party.members.some((pm: PartyMember) => !pm.displayName)) await party.updateMemberBasicInfo();

            let invitation = partyData.invites.find((i: any) => i.sent_by === pingerId && i.status === 'SENT');
            if (!invitation) invitation = createPartyInvitation(this.client.user.self!.id, pingerId, { ...body, ...partyData });

            const invite = new ReceivedPartyInvitation(this.client, party, friend, this.client.user.self!, invitation);
            this.client.emit('party:invite', invite);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;

            if (memberId === this.client.user.self!.id) {
              if (!this.client.party.me) this.client.party.members.set(memberId, new ClientPartyMember(this.client.party, body));
              await this.client.party.me.sendPatch(this.client.party.me.meta.schema);
            } else {
              this.client.party.members.set(memberId, new PartyMember(this.client.party, body));
            }

            const member = this.client.party.members.get(memberId);
            if (!member) break;
            if (!member.displayName) await member.fetch();

            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();

            try {
              await this.client.waitForEvent('party:member:updated', 2000, (um) => um.id === member.id);
            } catch (err) {
              // ignore. meta will be partly undefined, but usually, if this takes longer than 2 seconds, something else went wrong
            }

            this.client.emit('party:member:joined', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) return;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            if (member.receivedInitialStateUpdate) {
              const newMeta = new PartyMemberMeta({ ...member.meta.schema });
              newMeta.update(body.member_state_updated, true);

              if (newMeta.outfit !== member.meta.outfit) {
                this.client.emit('party:member:outfit:updated', member, newMeta.outfit, member.meta.outfit);
              }

              if (newMeta.backpack !== member.meta.backpack) {
                this.client.emit('party:member:backpack:updated', member, newMeta.backpack, member.meta.backpack);
              }

              if (newMeta.pickaxe !== member.meta.pickaxe) {
                this.client.emit('party:member:pickaxe:updated', member, newMeta.pickaxe, member.meta.pickaxe);
              }

              if (newMeta.emote !== member.meta.emote) {
                this.client.emit('party:member:emote:updated', member, newMeta.emote, member.meta.emote);
              }

              if (newMeta.isReady !== member.meta.isReady) {
                this.client.emit('party:member:readiness:updated', member, newMeta.isReady, member.meta.isReady);
              }

              if (JSON.stringify(newMeta.match) !== JSON.stringify(member.meta.match)) {
                this.client.emit('party:member:matchstate:updated', member, newMeta.match, member.meta.match);
              }
            }

            member.updateData(body);
            member.receivedInitialStateUpdate = true;
            this.client.emit('party:member:updated', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) {
              if (this.client.party.pendingMemberConfirmations.has(memberId)) {
                this.client.party.pendingMemberConfirmations.delete(memberId);
                break;
              }

              throw new PartyMemberNotFoundError(memberId);
            }

            if (memberId === this.client.user.self!.id) {
              await this.client.initParty(true, false);
              break;
            }

            this.client.party.members.delete(member.id);
            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();

            this.client.emit('party:member:left', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id
              || body.account_id === this.client.user.self!.id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) return;

            this.client.party.members.delete(member.id);
            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();

            this.client.emit('party:member:expired', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            if (member.id === this.client.user.self!.id) {
              this.client.party = undefined;
              await this.client.initParty(true, false);
            } else {
              this.client.party.members.delete(member.id);
              this.client.setStatus();
              if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();
            }

            this.client.emit('party:member:kicked', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_DISCONNECTED': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            this.client.party.members.delete(member.id);
            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();
            this.client.emit('party:member:disconnected', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_NEW_CAPTAIN': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            if (this.client.party.leader) this.client.party.leader.role = '';

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            member.role = 'CAPTAIN';
            this.client.setStatus();

            this.client.emit('party:member:promoted', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.PARTY_UPDATED':
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            this.client.party.updateData(body);
            this.client.setStatus();

            this.client.emit('party:updated', this.client.party);
            break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const user = await this.client.user.fetch(body.account_id);
            if (!user) break;

            const confirmation = new PartyMemberConfirmation(this.client, this.client.party, user, body);
            this.client.party.pendingMemberConfirmations.set(user.id, confirmation);

            if (this.client.listenerCount('party:member:confirmation') > 0) {
              this.client.emit('party:member:confirmation', confirmation);
            } else {
              await confirmation.confirm();
            }
          } break;

          case 'com.epicgames.social.party.notification.v0.INITIAL_INTENTION': {
            if (this.client.config.disablePartyService) break;
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const friend = await this.waitForFriend(body.requester_id);
            if (!friend) throw new FriendNotFoundError(body.requester_id);

            const request = new ReceivedPartyJoinRequest(this.client, friend, this.client.user.self!, body);

            this.client.emit('party:joinrequest', request);
          } break;
        }
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing ${body.type}: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:message:error', err);
      }
    });
  }

  /**
   * Waits for a friend to be added to the clients cache
   */
  private async waitForFriend(id: string) {
    const cachedFriend = this.client.friend.list.get(id);
    if (cachedFriend) return cachedFriend;

    try {
      this.client.setMaxListeners(this.client.getMaxListeners() + 1);
      const friend = await this.client.waitForEvent('friend:added', 5000, (f) => f.id === id);
      return friend[0];
    } catch (e) {
      return undefined;
    } finally {
      this.client.setMaxListeners(this.client.getMaxListeners() - 1);
    }
  }

  /**
   * Sends a presence to all or a specific friend
   * @param status The status message. Can be undefined if you want to reset it
   * @param show The show type of the presence (eg "away")
   * @param to The JID of a specific friend
   */
  public sendStatus(status?: object | string, show?: Constants.PresenceShow, to?: string) {
    if (!status) {
      this.connection!.sendPresence();
      return;
    }

    this.connection!.sendPresence({
      status: JSON.stringify(typeof status === 'string' ? { Status: status } : status),
      to,
      show,
    });
  }

  /**
   * Sends an XMPP message
   * @param to The message receiver's JID
   * @param content The message that will be sent
   * @param type The message type (eg "chat" or "groupchat")
   */
  public async sendMessage(to: string, content: string, type: Constants.MessageType = 'chat') {
    return this.waitForSentMessage(this.connection!.sendMessage({
      to,
      body: content,
      type,
    }));
  }

  /**
   * Wait until a message is sent
   * @param id The message id
   * @param timeout How long to wait for the message
   */
  public waitForSentMessage(id: string, timeout = 1000) {
    return new Promise<Stanzas.Message | undefined>((res) => {
      // eslint-disable-next-line no-undef
      let messageTimeout: NodeJS.Timeout;

      const listener = (m: Stanzas.Message) => {
        if (m.id === id) {
          this.connection!.removeListener('message:sent', listener);
          if (messageTimeout) clearTimeout(messageTimeout);
          res(m);
        }
      };

      this.connection!.on('message:sent', listener);
      messageTimeout = setTimeout(() => {
        res(undefined);
        this.connection!.removeListener('message:sent', listener);
      }, timeout);
    });
  }

  /**
   * Joins a multi user chat room (MUC)
   * @param jid The room's JID
   * @param nick The client's nickname
   */
  public async joinMUC(jid: string, nick: string) {
    return this.connection!.joinRoom(jid, nick);
  }

  /**
   * Leaves a multi user chat room (MUC)
   * @param jid The room's JID
   * @param nick The client's nickname
   */
  public async leaveMUC(jid: string, nick: string) {
    return this.connection!.leaveRoom(jid, nick);
  }
}

export default XMPP;
