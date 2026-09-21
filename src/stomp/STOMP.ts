import WebSocket from 'ws';
import Base from '../Base';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import Endpoints from '../../resources/Endpoints';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import Party from '../structures/party/Party';
import PartyMessage from '../structures/party/PartyMessage';
import ReceivedPartyInvitation from '../structures/party/ReceivedPartyInvitation';
import ReceivedPartyJoinRequest from '../structures/party/ReceivedPartyJoinRequest';
import STOMPConnectionTimeoutError from '../exceptions/STOMPConnectionTimeoutError';
import STOMPMessage from './STOMPMessage';
import STOMPConnectionError from '../exceptions/STOMPConnectionError';
import { decodeSTOMPMessageBody, getEOSLobbyId } from '../util/Util';
import FriendPresence from '../structures/friend/FriendPresence';
import PresenceParty from '../structures/party/PresenceParty';
import type { StompMessageData } from './STOMPMessage';
import type {
  EOSConnectMessage, EOSPartyDisbandedData, EOSPartyInviteData, EOSPartyJoinRequestData,
  EOSPresencePropsInGame, PresenceOnlineType, PresencePartyData,
} from '../../resources/structs';
import type ClientParty from '../structures/party/ClientParty';

const INVITATION_EXPIRATION_MS = 60 * 60 * 1000;
const JOIN_REQUEST_EXPIRATION_MS = 60 * 1000;

/**
 * Represents the client's EOS Connect STOMP manager (i.e. chat messages)
 */
class STOMP extends Base {
  private connection?: WebSocket;
  public connectionId?: string;
  public publicConnectionId?: string;
  public privateConnectionId?: string;
  private publicSubscriptionId?: string;
  private privateSubscriptionId?: string;
  private pingInterval?: NodeJS.Timeout;
  private connectionRetryCount = 0;
  private partyRecreationInProgress = false;

  public get isConnected() {
    return this.connection?.readyState === WebSocket.OPEN;
  }

  public async connect() {
    const authSession = this.client.auth.sessions.get(AuthSessionStoreKey.FortniteEOS);
    if (!authSession) throw new AuthenticationMissingError(AuthSessionStoreKey.FortniteEOS);

    this.client.debug('[STOMP] Connecting...');
    const connectionStartTime = Date.now();
    this.connection = new WebSocket(`wss://${Endpoints.EOS_STOMP}`, {
      headers: {
        Authorization: `Bearer ${authSession.accessToken}`,
        'Epic-Connect-Device-Id': ' ',
        'Epic-Connect-Protocol': 'stomp',
      },
    });

    return new Promise<void>((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        this.disconnect();
        reject(new STOMPConnectionTimeoutError(this.client.config.stompConnectionTimeout));
      }, this.client.config.stompConnectionTimeout);

      this.connection!.once('open', () => {
        this.sendMessage({
          command: 'CONNECT',
          headers: {
            'accept-version': '1.0,1.1,1.2',
            'heart-beat': '30000,0',
            authorization: `Bearer ${authSession.accessToken}`,
          },
        });

        this.registerEvents(resolve, reject, connectionStartTime, connectionTimeout);
      });

      this.connection!.once('error', (error) => {
        this.client.debug(`[STOMP] Connection failed: ${error.message}`);

        clearTimeout(connectionTimeout);
        reject(new STOMPConnectionError(error.message));
      });
    });
  }

  private registerEvents(
    resolve: () => void,
    reject: (reason?: unknown) => void,
    connectionStartTime: number,
    connectionTimeout: NodeJS.Timeout,
  ) {
    this.connection!.on('close', async (code, reason) => {
      this.disconnect();

      if (this.connectionRetryCount >= 2) {
        this.connectionRetryCount = 0;
        this.client.debug(`[STOMP] Disconnected, retry limit reached: ${reason}`);

        return;
      }

      this.connectionRetryCount += 1;

      const retryDelay = Promise.withResolvers<void>();
      setTimeout(retryDelay.resolve, 5000);
      await retryDelay.promise;

      try {
        await this.connect();
        await this.rebindEOSPartyConnection();
      } catch (error) {
        this.client.debug(`[STOMP] Reconnect failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    this.connection!.on('message', async (raw: WebSocket.RawData) => {
      const text = STOMP.decodeRawData(raw);
      const message = STOMPMessage.fromString(text);
      if (message.command === 'CONNECTED') {
        this.subscribeEAS(message.headers.session);
        return;
      }
      if ((message.command !== 'MESSAGE' && message.command !== 'ERROR') || !message.body) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.body);
      } catch {
        this.client.debug(`[STOMP] Invalid message body: ${message.body}`);
        return;
      }
      if (message.command === 'ERROR') {
        if (STOMP.isAuthenticationErrorFrame(parsed)) {
          this.client.debug('[STOMP] Authentication token is invalid; reconnecting...');
          this.connection?.close();
        }
        return;
      }
      if (!STOMP.isEOSConnectMessage(parsed)) {
        this.client.debug(`[STOMP] Invalid message body: ${message.body}`);
        return;
      }
      const data = parsed;

      switch (data.type) {
        case 'core.connect.v1.connected':
          if (!data.connectionId || !this.publicSubscriptionId || !this.privateSubscriptionId) {
            reject(new STOMPConnectionError('EOS Connect did not provide Party v2 connection IDs'));
            return;
          }
          clearTimeout(connectionTimeout);
          this.connectionId = data.connectionId;
          this.publicConnectionId = `${data.connectionId}#${this.publicSubscriptionId}`;
          this.privateConnectionId = `${data.connectionId}#${this.privateSubscriptionId}`;
          this.connectionRetryCount = 0;
          this.client.debug(`[STOMP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);
          resolve();
          break;
        case 'core.connect.v1.connect-failed':
          clearTimeout(connectionTimeout);
          reject(new STOMPConnectionError(data.message, data.statusCode));
          break;
        case 'social.chat.v1.NEW_WHISPER':
          await this.handleFriendMessage(data.payload.message, data.id);
          break;
        case 'social.chat.v1.NEW_MESSAGE':
          await this.handleChatMessage(data);
          break;
        case 'presence.v1.UPDATE':
          await this.handlePresence(data);
          break;
        case 'party.v2.MEMBER_EXPIRED_PARTY_DISBANDED':
          await this.handlePartyDisbanded(data.payload);
          break;
        case 'party.v2.INVITE':
        case 'party.v2.INVITE_CREATED':
          await this.handlePartyInvite(data.payload);
          break;
        case 'party.v2.JOIN_REQUEST':
        case 'party.v2.INTENTION':
          await this.handlePartyJoinRequest(data.payload);
          break;
        case 'party.v2.JOIN_REQUEST_EXPIRED':
        case 'party.v2.JOIN_REQUEST_CANCELLED':
        case 'party.v2.JOIN_REQUEST_CANCELED':
        case 'party.v2.JOIN_REQUEST_DECLINED':
        case 'party.v2.INTENTION_EXPIRED':
        case 'party.v2.INTENTION_CANCELLED':
        case 'party.v2.INTENTION_CANCELED':
        case 'party.v2.INTENTION_DECLINED':
          break;
        default:
          this.client.debug(`[STOMP] Unknown message type: ${data.type}`);
          break;
      }
    });
  }

  private subscribeEAS(sessionId?: string) {
    const suffix = Math.floor(Math.random() * 0xffffffff).toString(16);
    this.publicSubscriptionId = `sub-eas-${suffix}`;
    this.privateSubscriptionId = `sub-eas-private-${suffix}`;
    const token = this.client.auth.sessions.get(AuthSessionStoreKey.FortniteEOS)!.accessToken;
    const destination = `deploymentId/${this.client.config.eosDeploymentId}/epicAccountId/${this.client.user.self!.id}`;
    const baseHeaders = { authorization: `Bearer ${token}`, 'ec-coord-accept-language': 'en' };
    this.sendMessage({
      command: 'SUBSCRIBE',
      headers: {
        id: this.publicSubscriptionId,
        destination,
        ...sessionId ? { receipt: `sub-0-${sessionId}` } : {},
        ...baseHeaders,
      },
    });
    this.sendMessage({
      command: 'SUBSCRIBE',
      headers: {
        id: this.privateSubscriptionId,
        destination,
        'ec-coord-temporary-subscription': 'parties-internal',
        ...sessionId ? { receipt: `sub-1-${sessionId}` } : {},
        ...baseHeaders,
      },
    });
    this.pingInterval = setInterval(() => {
      if (this.isConnected) this.connection!.send('\n');
    }, 30000);
  }

  private static decodeRawData(raw: WebSocket.RawData): string {
    if (typeof raw === 'string') return raw;
    if (Buffer.isBuffer(raw)) return raw.toString();
    if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
    return Buffer.concat(raw).toString();
  }

  private static isEOSConnectMessage(value: unknown): value is EOSConnectMessage {
    return typeof value === 'object' && value !== null
      && 'type' in value && typeof value.type === 'string';
  }

  private static isAuthenticationErrorFrame(value: unknown) {
    return typeof value === 'object' && value !== null
      && 'statusCode' in value && value.statusCode === 4019;
  }

  private async handleFriendMessage(message: { senderId: string; body: string; time: number }, id?: string) {
    const { senderId, body, time } = message;
    if (senderId === this.client.user.self!.id) return;

    const friend = await this.client.xmpp.waitForFriend(senderId);
    if (!friend) return;

    this.client.emit('friend:message', new ReceivedFriendMessage(this.client, {
      content: decodeSTOMPMessageBody(body), author: friend, id: id || `${senderId}:${time}`, sentAt: new Date(time),
    }));
  }

  private async handleChatMessage(data: Extract<EOSConnectMessage, { type: 'social.chat.v1.NEW_MESSAGE' }>) {
    const { conversation, message } = data.payload;
    if (conversation.type === 'dm') {
      await this.handleFriendMessage(message, data.id);
      return;
    }
    if (conversation.type !== 'epic_party') return;

    await this.client.partyLock.wait();
    const eosPartyId = conversation.conversationId.replace(/^ep-/, '');
    if (!this.client.party || this.client.party.eosPartyId !== eosPartyId
      || message.senderId === this.client.user.self!.id) return;

    const author = this.client.party.members.get(message.senderId);
    if (!author) return;

    this.client.emit('party:member:message', new PartyMessage(this.client, {
      content: decodeSTOMPMessageBody(message.body),
      author,
      sentAt: new Date(message.time),
      id: data.id || `${message.senderId}:${message.time}`,
      party: this.client.party,
    }));
  }

  private async handlePresence(data: Extract<EOSConnectMessage, { type: 'presence.v1.UPDATE' }>) {
    await this.client.cacheLock.wait();
    const friend = await this.client.xmpp.waitForFriend(data.payload.accountId);
    if (!friend) return;
    if (data.payload.status === 'offline') {
      friend.lastAvailableTimestamp = undefined;
      friend.party = undefined;
      this.client.emit('friend:offline', friend);
      return;
    }
    const presence = data.payload.perNs.find((entry) => entry.productId === 'Fortnite' || entry.ns === this.client.config.eosDeploymentId);
    if (!presence) return;
    const before = friend.presence;
    const after = new FriendPresence(this.client, presence, friend, presence.status);
    friend.lastAvailableTimestamp = Date.now();
    friend.presence = after;
    const rawParty = presence.props['party.joininfodata.286331153'];
    if (typeof rawParty === 'string') {
      const partyData = FriendPresence.parsePropsValue<PresencePartyData>(rawParty);
      friend.party = new PresenceParty(this.client, partyData);
    }
    this.client.emit('friend:presence', before, after);
  }

  private async rebindEOSPartyConnection() {
    // eslint-disable-next-line prefer-destructuring -- Keep the party stable through the awaited rebind.
    const party = this.client.party;
    if (!party?.eosPartyId || !this.publicConnectionId) return;

    try {
      await this.client.eosParty.connect(party.eosPartyId, this.publicConnectionId);
    } catch {
      await this.recreateParty(party);
    }
  }

  private async recreateParty(party: ClientParty, partyDisbanded = false) {
    if (this.partyRecreationInProgress) return;

    this.partyRecreationInProgress = true;
    try {
      if (partyDisbanded) {
        await this.leaveDisbandedParty(party);
      } else {
        await party.leave(false);
      }

      await this.client.createParty();
      if (this.client.party) this.client.emit('party:recreated', this.client.party);
    } finally {
      this.partyRecreationInProgress = false;
    }
  }

  private async leaveDisbandedParty(party: ClientParty) {
    this.client.partyLock.lock();
    try {
      await this.client.http.epicgamesRequest({
        method: 'DELETE',
        url: `${Endpoints.BR_PARTY}/parties/${party.id}/members/${this.client.user.self!.id}`,
      }, AuthSessionStoreKey.Fortnite);

      if (this.client.party !== party) return;

      this.client.party = undefined;
      await this.patchInternalPresence();
    } finally {
      this.client.partyLock.unlock();
    }
  }

  private async handlePartyDisbanded(payload: EOSPartyDisbandedData) {
    const partyId = payload.party_id ?? payload.partyId;
    if (!partyId || !this.client.party || this.client.party.eosPartyId !== partyId) return;

    await this.recreateParty(this.client.party, true);
  }

  private async handlePartyInvite(payload: EOSPartyInviteData) {
    const partyId = payload.party_id ?? payload.partyId;
    const inviterId = payload.sent_by ?? payload.inviter_id ?? payload.senderId;
    if (!partyId || !inviterId || this.client.listenerCount('party:invite') === 0) return;

    const sender = await this.client.xmpp.waitForFriend(inviterId);
    if (!sender) return;

    const sentAt = payload.sent_at ?? payload.sent ?? new Date().toISOString();
    const expiresAt = payload.expires_at ?? new Date(Date.now() + INVITATION_EXPIRATION_MS).toISOString();
    const party = this.createInvitationParty(partyId, sentAt);

    this.client.emit('party:invite', new ReceivedPartyInvitation(this.client, party, sender, this.client.user.self!, {
      eosPartyId: partyId,
      sent_at: sentAt,
      expires_at: expiresAt,
    }));
  }

  private createInvitationParty(eosPartyId: string, sentAt: string) {
    return new Party(this.client, {
      id: getEOSLobbyId(eosPartyId, this.client.config.partyBuildId),
      eosPartyId,
      created_at: sentAt,
      updated_at: sentAt,
      config: {
        type: 'DEFAULT',
        joinability: 'OPEN',
        discoverability: 'ALL',
        sub_type: 'default',
        max_size: 16,
        invite_ttl: 3600,
        join_confirmation: false,
        intention_ttl: 60,
      },
      members: [],
      meta: {},
      invites: [],
      revision: 0,
    });
  }

  private async handlePartyJoinRequest(payload: EOSPartyJoinRequestData) {
    const requesterId = payload.requester_id
      ?? payload.requesterId
      ?? payload.sent_by
      ?? payload.inviter_id
      ?? payload.senderId
      ?? payload.account_id;
    if (!requesterId || this.client.listenerCount('party:joinrequest') === 0) return;

    const sender = await this.client.xmpp.waitForFriend(requesterId);
    if (!sender) return;

    const sentAt = payload.sent_at ?? payload.sent ?? new Date().toISOString();
    const expiresAt = payload.expires_at ?? new Date(Date.now() + JOIN_REQUEST_EXPIRATION_MS).toISOString();

    this.client.emit('party:joinrequest', new ReceivedPartyJoinRequest(this.client, sender, this.client.user.self!, {
      sent_at: sentAt,
      expires_at: expiresAt,
    }));
  }

  public async patchPresence(activityValue: string, props: EOSPresencePropsInGame, onlineType: PresenceOnlineType = 'online') {
    const payload = {
      status: onlineType, activity: { value: activityValue }, conn: { props: {} }, props,
    };
    if (!this.publicConnectionId) return;
    await this.client.http.epicgamesRequest({
      method: 'PATCH',
      url: [
        Endpoints.EOS_PRESENCE,
        this.client.config.eosDeploymentId,
        this.client.user.self!.id,
        'presence',
        encodeURIComponent(this.publicConnectionId),
      ].join('/'),
      headers: { 'Content-Type': 'application/json' },
      data: payload,
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async patchInternalPresence(party?: { eosPartyId?: string; isPrivate: boolean; size: number }) {
    if (!this.privateConnectionId) return;
    await this.client.http.epicgamesRequest({
      method: 'PATCH',
      url: [
        Endpoints.EOS_PARTY.replace('/party', '/presence/internal/v1/_'),
        this.client.user.self!.id,
        'presence',
        encodeURIComponent(this.privateConnectionId),
      ].join('/'),
      headers: { 'Content-Type': 'application/json' },
      data: {
        status: 'online',
        activity: {},
        conn: { props: {} },
        ...party?.eosPartyId ? {
          party: {
            type: party.isPrivate ? 'INVITE_ONLY' : 'OPEN',
            id: party.eosPartyId,
            clientJoinable: true,
            memberCount: party.size,
            timestamp: new Date().toISOString(),
          },
        } : {},
      },
    }, AuthSessionStoreKey.FortniteEOS);
  }

  public async disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = undefined;

    if (this.connection) {
      this.connection.removeAllListeners();
      if (this.connection.readyState === WebSocket.OPEN) this.connection.close();
    }

    this.connection = undefined;
    this.connectionId = undefined;
    this.publicConnectionId = undefined;
    this.privateConnectionId = undefined;
    this.publicSubscriptionId = undefined;
    this.privateSubscriptionId = undefined;
  }

  private sendMessage(message: StompMessageData) {
    this.connection!.send(new STOMPMessage(message).toString());
  }
}

export default STOMP;
