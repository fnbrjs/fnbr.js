import WebSocket from 'ws';
import Base from '../Base';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import Endpoints from '../../resources/Endpoints';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import PartyMessage from '../structures/party/PartyMessage';
import STOMPConnectionTimeoutError from '../exceptions/STOMPConnectionTimeoutError';
import STOMPMessage from './STOMPMessage';
import STOMPConnectionError from '../exceptions/STOMPConnectionError';
import { decodeSTOMPMessageBody } from '../util/Util';
import FriendPresence from '../structures/friend/FriendPresence';
import PresenceParty from '../structures/party/PresenceParty';
import type { StompMessageData } from './STOMPMessage';
import type {
  EOSConnectMessage, EOSPresencePropsInGame, PresenceOnlineType, PresencePartyData,
} from '../../resources/structs';
/** EOS Connect STOMP transport, including Party v2 subscriptions. */
class STOMP extends Base {
  private connection?: WebSocket;
  public connectionId?: string;
  public publicConnectionId?: string;
  public privateConnectionId?: string;
  private publicSubscriptionId?: string;
  private privateSubscriptionId?: string;
  private pingInterval?: NodeJS.Timeout;
  private connectionRetryCount = 0;
  private connectedAt?: number;
  private readonly seenMessageIds = new Set<string>();
  private readonly seenMessageOrder: string[] = [];

  public get isConnected() {
    return this.connection?.readyState === WebSocket.OPEN;
  }

  public async connect() {
    const session = this.client.auth.sessions.get(AuthSessionStoreKey.FortniteEOS);
    if (!session) throw new AuthenticationMissingError(AuthSessionStoreKey.FortniteEOS);

    this.client.debug('[STOMP] Connecting...');
    const connectionStartTime = Date.now();
    this.connection = new WebSocket(`wss://${Endpoints.EOS_STOMP}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Epic-Connect-Device-Id': ' ',
        'Epic-Connect-Protocol': 'stomp',
      },
    });

    const { promise, resolve, reject } = Promise.withResolvers<void>();
    const connectionTimeout = setTimeout(() => {
      this.disconnect();
      reject(new STOMPConnectionTimeoutError(this.client.config.stompConnectionTimeout));
    }, this.client.config.stompConnectionTimeout);

    this.connection.once('open', () => {
      this.connectedAt = Date.now();
      this.sendMessage({
        command: 'CONNECT',
        headers: {
          'accept-version': '1.0,1.1,1.2',
          'heart-beat': '30000,0',
          authorization: `Bearer ${session.accessToken}`,
        },
      });
      this.registerEvents(resolve, reject, connectionStartTime, connectionTimeout);
    });

    this.connection.once('error', (error) => {
      clearTimeout(connectionTimeout);
      reject(new STOMPConnectionError(error.message));
    });
    return promise;
  }

  private registerEvents(
    resolve: () => void,
    reject: (reason?: unknown) => void,
    connectionStartTime: number,
    connectionTimeout: NodeJS.Timeout,
  ) {
    this.connection!.on('close', async (code, reason) => {
      this.disconnect();
      this.connectedAt = undefined;
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
        await this.client.rebindEOSPartyConnection();
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
      if (message.command !== 'MESSAGE' || !message.body) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(message.body);
      } catch {
        this.client.debug(`[STOMP] Invalid message body: ${message.body}`);
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
          this.handleWhisper(data);
          break;
        case 'social.chat.v1.NEW_MESSAGE':
          await this.handleChatMessage(data);
          break;
        case 'presence.v1.UPDATE':
          await this.handlePresence(data);
          break;
        default:
          if (data.type.startsWith('party.v2.')) {
            await this.client.handleEOSPartyNotification(data.type, data.payload ?? {});
          } else {
            this.client.debug(`[STOMP] Unknown message type: ${data.type}`);
          }
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

  private isDuplicate(data: EOSConnectMessage): boolean {
    const key = data.id || (data.type === 'social.chat.v1.NEW_MESSAGE'
      ? `${data.payload.message.senderId}:${data.payload.message.time}:${data.payload.message.body}`
      : undefined);
    if (!key) return false;
    if (this.seenMessageIds.has(key)) return true;
    this.seenMessageIds.add(key);
    this.seenMessageOrder.push(key);
    if (this.seenMessageOrder.length > 256) this.seenMessageIds.delete(this.seenMessageOrder.shift()!);
    return false;
  }

  private handleWhisper(data: Extract<EOSConnectMessage, { type: 'social.chat.v1.NEW_WHISPER' }>) {
    const { senderId, body, time } = data.payload.message;
    const friend = this.client.friend.list.get(senderId);
    if (!friend || senderId === this.client.user.self!.id) return;
    this.client.emit('friend:message', new ReceivedFriendMessage(this.client, {
      content: decodeSTOMPMessageBody(body), author: friend, id: data.id || `${senderId}:${time}`, sentAt: new Date(time),
    }));
  }

  private async handleChatMessage(data: Extract<EOSConnectMessage, { type: 'social.chat.v1.NEW_MESSAGE' }>) {
    const { conversation, message } = data.payload;
    if (conversation.type !== 'epic_party') return;
    await this.client.partyLock.wait();
    const eosPartyId = conversation.conversationId.replace(/^ep-/, '');
    const { party } = this.client;
    if (!party || party.eosPartyId !== eosPartyId || message.senderId === this.client.user.self!.id) return;
    const author = party.members.get(message.senderId);
    if (!author) return;
    this.client.emit('party:member:message', new PartyMessage(this.client, {
      content: decodeSTOMPMessageBody(message.body),
      author,
      sentAt: new Date(message.time),
      id: data.id || `${message.senderId}:${message.time}`,
      party,
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
      const parsedParty = FriendPresence.parsePropsValue<Record<string, unknown>>(rawParty);
      if (parsedParty && typeof parsedParty === 'object') {
        const party: PresencePartyData = {
          bIsPrivate: parsedParty.bIsPrivate === true,
          p: typeof parsedParty.p === 'string' ? parsedParty.p : undefined,
          partyId: typeof parsedParty.partyId === 'string' ? parsedParty.partyId : undefined,
          d: typeof parsedParty.d === 'string' ? parsedParty.d : undefined,
          appId: typeof parsedParty.appId === 'string' ? parsedParty.appId : undefined,
          b: typeof parsedParty.b === 'string' ? parsedParty.b : undefined,
          buildId: typeof parsedParty.buildId === 'string' ? parsedParty.buildId : undefined,
          f: typeof parsedParty.f === 'number' ? parsedParty.f : undefined,
          partyFlags: typeof parsedParty.partyFlags === 'number' ? parsedParty.partyFlags : undefined,
          nAR: typeof parsedParty.nAR === 'number' ? parsedParty.nAR : undefined,
          notAcceptingReason: typeof parsedParty.notAcceptingReason === 'number' ? parsedParty.notAcceptingReason : undefined,
          pc: typeof parsedParty.pc === 'number' ? parsedParty.pc : undefined,
        };
        friend.party = new PresenceParty(this.client, party);
      }
    }
    this.client.emit('friend:presence', before, after);
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
