import {
  createClient, Stanzas, Agent, Constants,
} from 'stanza';
import crypto from 'crypto';
import Client from './Client';
import Base from './Base';
import Endpoints from '../../resources/Endpoints';
import PartyMessage from '../structures/PartyMessage';
import FriendPresence from '../structures/FriendPresence';
import Friend from '../structures/Friend';
import IncomingPendingFriend from '../structures/IncomingPendingFriend';
import OutgoingPendingFriend from '../structures/OutgoingPendingFriend';
import BlockedUser from '../structures/BlockedUser';
import Party from '../structures/Party';
import { createPartyInvitation } from '../util/Util';
import ClientUser from '../structures/ClientUser';
import ReceivedPartyInvitation from '../structures/ReceivedPartyInvitation';
import FriendNotFoundError from '../exceptions/FriendNotFoundError';
import ClientPartyMember from '../structures/ClientPartyMember';
import PartyMember from '../structures/PartyMember';
import PartyMemberNotFoundError from '../exceptions/PartyMemberNotFoundError';
import PartyMemberConfirmation from '../structures/PartyMemberConfirmation';
import ReceivedPartyJoinRequest from '../structures/ReceivedPartyJoinRequest';
import PresenceParty from '../structures/PresenceParty';
import ReceivedFriendMessage from '../structures/ReceivedFriendMessage';

/**
 * Represents the client's XMPP manager
 * @private
 */
class XMPP extends Base {
  /**
   * XMPP agent
   */
  private stream?: Agent;

  /**
   * Whether the stream is being disconnected. Used to check if the stream was meant to be disconnected
   */
  private isDisconnecting: boolean;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.stream = undefined;
    this.isDisconnecting = false;
  }

  /**
   * Whether the XMPP agent is connected
   */
  public get isConnected() {
    return !!this.stream && this.stream.sessionStarted;
  }

  /**
   * Returns the xmpp JID
   */
  public get JID() {
    return this.stream?.jid;
  }

  /**
   * Returns the xmpp resource
   */
  public get resource() {
    return this.stream?.config.resource;
  }

  /**
   * Creates the XMPP agent and binds it to XMPP#stream.
   * Also registers all events
   */
  public setup() {
    this.stream = createClient({
      jid: `${this.client.user?.id}@${Endpoints.EPIC_PROD_ENV}`,
      server: Endpoints.EPIC_PROD_ENV,
      transports: {
        websocket: `wss://${Endpoints.XMPP_SERVER}`,
        bosh: false,
      },
      credentials: {
        host: Endpoints.EPIC_PROD_ENV,
        username: this.client.user?.id,
        password: this.client.auth.auths.get('fortnite')?.token,
      },
      resource: `V2:Fortnite:${this.client.config.platform}::${crypto.randomBytes(16).toString('hex').toUpperCase()}`,
    });

    this.stream.enableKeepAlive({
      interval: this.client.config.xmppKeepAliveInterval,
    });

    this.setupEvents();
  }

  /**
   * Connects the XMPP agent to Epicgames' XMPP servers
   */
  public async connect() {
    if (!this.stream) return { error: new Error('XMPP#stream is undefined. Please use XMPP#setup before calling XMPP#connect') };

    this.client.debug('[XMPP] Connecting...');
    const connectionStartTime = Date.now();

    return new Promise<{ response?: boolean, error?: Error | Stanzas.StreamError }>((res) => {
      const timeout = setTimeout(() => {
        res({ error: new Error('Timeout of 15000ms exceeded') });
      }, 15000);

      this.stream?.once('session:started', () => {
        clearTimeout(timeout);
        this.client.debug(`[XMPP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);

        this.client.setStatus();

        res({ response: true });
      });

      this.stream?.once('stream:error', (err) => {
        clearTimeout(timeout);
        res({ error: err });
      });

      this.stream?.connect();
    });
  }

  /**
   * Disconnects the XMPP client.
   * Also performs a cleanup
   */
  public async disconnect() {
    if (!this.isConnected) return { response: true };

    this.client.debug('[XMPP] Disconnecting...');
    const disconnectionStartTime = Date.now();

    return new Promise<{ response?: boolean, error?: Error }>((res) => {
      const timeout = this.client.setTimeout(() => {
        res({ error: new Error('Timeout of 15000ms exceeded') });
        this.isDisconnecting = false;
      }, 15000);

      this.stream?.once('disconnected', () => {
        clearTimeout(timeout);
        this.destroy();
        res({ response: true });
        this.client.debug(`[XMPP] Successfully disconnected (${((Date.now() - disconnectionStartTime) / 1000).toFixed(2)}s)`);
        this.isDisconnecting = false;
      });

      this.isDisconnecting = true;
      this.stream?.disconnect();
    });
  }

  /**
   * Cleans everything up after the XMPP client disconnected
   */
  private destroy() {
    this.stream?.removeAllListeners();
    this.stream = undefined;
  }

  /**
   * Registers all events
   */
  private setupEvents() {
    if (!this.stream) throw new Error('Cannot register events before stream was initialized');

    this.stream.on('disconnected', async () => {
      if (this.isDisconnecting) return;

      this.destroy();
      this.setup();

      await this.client.updateCaches();
      await this.connect();
      await this.client.initParty();
    });

    this.stream.on('raw:incoming', (raw) => this.client.debug(`IN ${raw}`, 'xmpp'));
    this.stream.on('raw:outgoing', (raw) => this.client.debug(`OUT ${raw}`, 'xmpp'));

    this.stream.on('groupchat', async (m) => {
      try {
        await this.client.partyLock.wait();

        const partyId = m.from.split('@')[0].replace('Party-', '');
        if (!this.client.party || this.client.party.id !== partyId) return;
        if (m.body === 'Welcome! You created new Multi User Chat Room.') return;

        const [, authorId] = m.from.split(':');
        if (authorId === this.client.user?.id) return;

        const authorMember = this.client.party.members.get(authorId);
        if (!authorMember) return;

        const partyMessage = new PartyMessage(this.client, {
          content: m.body || '', author: authorMember, sentAt: new Date(), id: m.id as string, party: this.client.party,
        });

        this.client.emit('party:member:message', partyMessage);
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing party chat message: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:chat:error', err);
      }
    });

    this.stream.on('chat', async (m) => {
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

    this.stream.on('presence', async (p) => {
      try {
        if (!p.status) return;

        const friendId = p.from.split('@')[0];
        if (friendId === this.client.user?.id) return;

        const friend = await this.waitForFriend(friendId);
        if (!friend) return;

        if (p.type === 'unavailable') {
          friend.lastAvailableTimestamp = undefined;
          friend.party = undefined;
          return;
        }

        friend.lastAvailableTimestamp = Date.now();

        const presence = JSON.parse(p.status);

        const before = this.client.friends.get(friendId)?.presence;
        const after = new FriendPresence(this.client, presence, friend);
        if ((this.client.config.cacheSettings.presences?.maxLifetime || 0) > 0) {
          friend.presence = after;
        }

        if (presence.Properties?.['party.joininfodata.286331153_j']) {
          friend.party = new PresenceParty(this.client, presence.Properties['party.joininfodata.286331153_j']);
        }

        this.client.emit('friend:presence', before, after);
      } catch (err: any) {
        this.client.debug(`[XMPP] Error while processing presence: ${err.name} - ${err.message}`);
        this.client.emit('xmpp:presence:error', err);
      }
    });

    this.stream.on('message', async (m) => {
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

            const user = await this.client.getProfile(accountId);
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

              this.client.friends.set(friend.id, friend);
              this.client.pendingFriends.delete(friend.id);

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

                this.client.pendingFriends.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request', pendingFriend);
              } else if (direction === 'OUTBOUND') {
                const pendingFriend = new OutgoingPendingFriend(this.client, {
                  accountId: user.id,
                  // Type casting is fine here because the lookup by id always returns external auths
                  displayName: user.displayName as string,
                  created,
                  favorite,
                });

                this.client.pendingFriends.set(pendingFriend.id, pendingFriend);
                this.client.emit('friend:request:sent', pendingFriend);
              }
            }
          } break;

          case 'FRIENDSHIP_REMOVE': {
            const { from, to, reason } = body;
            const accountId = from === this.client.user?.id ? to : from;

            if (reason === 'ABORTED') {
              const pendingFriend = this.client.pendingFriends.get(accountId);
              if (!pendingFriend) break;

              this.client.pendingFriends.delete(pendingFriend.id);
              this.client.emit('friend:request:aborted', pendingFriend);
            } else if (reason === 'REJECTED') {
              const pendingFriend = this.client.pendingFriends.get(accountId);
              if (!pendingFriend || !(pendingFriend instanceof OutgoingPendingFriend)) break;

              this.client.pendingFriends.delete(pendingFriend.id);
              this.client.emit('friend:request:declined', pendingFriend);
            } else if (reason === 'DELETED') {
              const friend = await this.waitForFriend(accountId);
              if (!friend) break;

              this.client.friends.delete(friend.id);
              this.client.emit('friend:removed', friend);
            }
          } break;

          case 'USER_BLOCKLIST_UPDATE': {
            const { status, accountId } = body;

            if (status === 'BLOCKED') {
              const user = await this.client.getProfile(accountId);
              if (!user) break;

              const blockedUser = new BlockedUser(this.client, user);

              this.client.blockedUsers.set(user.id, blockedUser);
              this.client.emit('user:blocked', blockedUser);
            } else if (status === 'UNBLOCKED') {
              const blockedUser = this.client.blockedUsers.get(accountId);
              if (!blockedUser) break;

              this.client.blockedUsers.delete(blockedUser.id);
              this.client.emit('user:unblocked', blockedUser);
            }
          } break;

          case 'com.epicgames.social.party.notification.v0.PING': {
            if (this.client.listenerCount('party:invite') === 0) break;

            const pingerId = body.pinger_id;

            const friend = await this.waitForFriend(pingerId);
            if (!friend) throw new FriendNotFoundError(pingerId);

            const data = await this.client.http.sendEpicgamesRequest(true, 'GET',
              `${Endpoints.BR_PARTY}/user/${this.client.user?.id}/pings/${pingerId}/parties`, 'fortnite');
            if (data.error) throw data.error;

            if (!data.response?.[0]) {
              this.client.debug(`[XMPP] Error while processing ${body.type}: Could't find an active invitation`);
              break;
            }

            const [partyData] = data.response;
            let party: Party;

            if (partyData.config.discoverability === 'ALL') party = await this.client.getParty(partyData.id);
            else party = new Party(this.client, partyData);

            let invitation = partyData.invites.find((i: any) => i.sent_by === pingerId && i.status === 'SENT');
            if (!invitation) invitation = createPartyInvitation((this.client.user as ClientUser).id, pingerId, { ...body, ...partyData });

            const invite = new ReceivedPartyInvitation(this.client, party, friend, this.client.user as ClientUser, invitation);
            this.client.emit('party:invite', invite);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_JOINED': {
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;

            if (memberId === this.client.user?.id) {
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

            this.client.emit('party:member:joined', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_STATE_UPDATED': {
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) return;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            member.updateData(body);
            this.client.emit('party:member:updated', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_LEFT': {
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

            if (memberId === this.client.user?.id) {
              await this.client.initParty(true, false);
              break;
            }

            this.client.party.members.delete(member.id);
            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();

            this.client.emit('party:member:left', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_EXPIRED': {
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) return;

            this.client.party.members.delete(member.id);
            this.client.setStatus();
            if (this.client.party.me.isLeader) await this.client.party.refreshSquadAssignments();

            this.client.emit('party:member:expired', member);
          } break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_KICKED': {
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const memberId = body.account_id;
            const member = this.client.party.members.get(memberId);
            if (!member) throw new PartyMemberNotFoundError(memberId);

            if (member.id === this.client.user?.id) {
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
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            this.client.party.updateData(body);
            this.client.setStatus();

            this.client.emit('party:updated', this.client.party);
            break;

          case 'com.epicgames.social.party.notification.v0.MEMBER_REQUIRE_CONFIRMATION': {
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const user = await this.client.getProfile(body.account_id);
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
            await this.client.partyLock.wait();
            if (!this.client.party || this.client.party.id !== body.party_id) break;

            const friend = await this.waitForFriend(body.requester_id);
            if (!friend) throw new FriendNotFoundError(body.requester_id);

            const request = new ReceivedPartyJoinRequest(this.client, this.client.user as ClientUser, friend, body);

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
    const cachedFriend = this.client.friends.get(id);
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
      this.stream?.sendPresence({
        status: undefined,
        to,
        show,
      });
      return;
    }

    this.stream?.sendPresence({
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
    if (!this.stream) return undefined;
    return this.waitForSentMessage(this.stream?.sendMessage({
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
    return new Promise<Stanzas.Message|undefined>((res) => {
      const listener = (m: Stanzas.Message) => {
        if (m.id === id) {
          res(m);
          this.stream?.removeListener('message:sent', listener);
        }
      };

      this.stream?.on('message:sent', listener);
      setTimeout(() => {
        res(undefined);
        this.stream?.removeListener('message:sent', listener);
      }, timeout);
    });
  }

  /**
   * Joins a multi user chat room (MUC)
   * @param jid The room's JID
   * @param nick The client's nickname
   */
  public async joinMUC(jid: string, nick: string) {
    return this.stream?.joinRoom(jid, nick);
  }

  /**
   * Leaves a multi user chat room (MUC)
   * @param jid The room's JID
   * @param nick The client's nickname
   */
  public async leaveMUC(jid: string, nick: string) {
    return this.stream?.leaveRoom(jid, nick);
  }
}

export default XMPP;
