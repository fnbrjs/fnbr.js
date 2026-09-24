import { AsyncQueue } from '@sapphire/async-queue';
import WebSocket from 'ws';
import Base from '../Base';
import { AuthSessionStoreKey, RetryDecision } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import RetryAbandonedError from '../exceptions/RetryAbandonedError';
import Endpoints from '../../resources/Endpoints';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import PartyMember from '../structures/party/PartyMember';
import ClientPartyMember from '../structures/party/ClientPartyMember';
import PartyMessage from '../structures/party/PartyMessage';
import ReceivedPartyInvitation from '../structures/party/ReceivedPartyInvitation';
import ReceivedPartyJoinRequest from '../structures/party/ReceivedPartyJoinRequest';
import STOMPConnectionTimeoutError from '../exceptions/STOMPConnectionTimeoutError';
import STOMPMessage from './STOMPMessage';
import STOMPConnectionError from '../exceptions/STOMPConnectionError';
import { decodeRawData, decodeSTOMPMessageBody } from '../util/Util';
import FriendPresence from '../structures/friend/FriendPresence';
import PresenceParty from '../structures/party/PresenceParty';
import STOMPMessageDedupe from './STOMPMessageDedupe';
import type Party from '../structures/party/Party';
import type ClientParty from '../structures/party/ClientParty';
import type { StompMessageData } from './STOMPMessage';
import type {
  EOSConnectMessage, EOSPartyInviteData, EOSPartyJoinRequestData, EOSPartyMemberUpdateData,
  EOSPresencePropsInGame, PresenceOnlineType, FortnitePartyPresenceData,
  FortnitePartyMemberData, EOSPartyUpdateData,
} from '../../resources/structs';

const JOIN_REQUEST_EXPIRATION_MS = 60 * 1000;

type EOSPartyScopedData = Pick<EOSPartyMemberUpdateData, 'party_id'>;

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
  private partyEventQueue = new AsyncQueue();
  private handledMessages = new STOMPMessageDedupe(100);

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

      await new Promise((res) => setTimeout(res, 5000));

      try {
        await this.connect();
        await this.rebindEOSPartyConnection();
      } catch (error) {
        this.client.debug(`[STOMP] Reconnect failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    this.connection!.on('message', async (raw: WebSocket.RawData) => {
      const text = decodeRawData(raw);
      const message = STOMPMessage.fromString(text);

      if (message.command === 'CONNECTED') {
        this.subscribeEAS(message.headers.session);
        return;
      }

      if (!message.body) return;
      if (message.command !== 'MESSAGE' && message.command !== 'ERROR') return;

      let data: unknown;
      try {
        data = JSON.parse(message.body);
      } catch {
        this.client.debug(`[STOMP] Invalid message body: ${message.body}`);
        return;
      }

      if (message.command === 'ERROR') {
        if (STOMP.isAuthenticationErrorFrame(data)) {
          this.client.debug('[STOMP] Authentication token is invalid; reconnecting...');
          this.connection?.close();
        }

        return;
      }

      if (!STOMP.isEOSConnectMessage(data)) {
        this.client.debug(`[STOMP] Invalid message body: ${message.body}`);
        return;
      }

      if (data.type.startsWith('party.v2.') && this.client.config.disablePartyService) return;

      this.client.emit('stomp:message', data);

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
          await this.handleFriendMessage(data.payload.message, data.id!);
          break;

        case 'social.chat.v1.NEW_MESSAGE':
          await this.handleChatMessage(data);
          break;

        case 'presence.v1.UPDATE':
          await this.handlePresence(data);
          break;

        case 'party.v2.MEMBER_JOINED':
          await this.handlePartyMemberJoined(data.payload);
          break;

        case 'party.v2.MEMBER_LEFT':
          await this.handlePartyMemberRemoved(data.payload);
          break;

        // Ignore, handled by XMPP
        case 'party.v2.MEMBER_STATE_UPDATED':
          break;

        // A disconnect can recover; keep the roster until EOS expires the member.
        case 'party.v2.MEMBER_DISCONNECTED':
          break;

        case 'party.v2.MEMBER_EXPIRED_AFTER_DISCONNECT':
          await this.handlePartyMemberRemoved(data.payload, 'party:member:expired');
          break;

        // Not needed, already handled by member leave and kick events
        case 'party.v2.MEMBER_EXPIRED_PARTY_DISBANDED':
          break;

        // Ignore, not needed
        case 'party.v2.MEMBER_CONNECTED':
        case 'party.v2.MEMBER_REFRESH_SUMMARY':
          break;

        case 'party.v2.PARTY_UPDATED':
          await this.handlePartyUpdated(data.payload);
          break;

        case 'party.v2.MEMBER_KICKED':
          await this.handlePartyKicked(data.payload);
          break;

        case 'party.v2.INVITE_CREATED':
          await this.handlePartyInvite(data.payload);
          break;

        // Ignore for now
        case 'party.v2.INVITE_EXPIRED':
          break;

        case 'party.v2.JOIN_REQUEST_CREATED':
          await this.handlePartyJoinRequest(data.payload);
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

    const baseHeaders = {
      authorization: `Bearer ${token}`,
      'ec-coord-accept-language': 'en',
    };

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

  private static isEOSConnectMessage(value: unknown): value is EOSConnectMessage {
    return typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';
  }

  private static isAuthenticationErrorFrame(value: unknown) {
    return typeof value === 'object' && value !== null && 'statusCode' in value && value.statusCode === 4019;
  }

  private async handleFriendMessage(message: { senderId: string; body: string; time: number }, id?: string) {
    if (message.senderId === this.client.user.self!.id) return;

    const ensuredId = id ?? `${message.senderId}:${message.time}`;
    if (this.handledMessages.hasHandled(ensuredId)) return;
    this.handledMessages.markHandled(ensuredId);

    const friend = await this.client.waitForFriend(message.senderId);
    if (!friend) return;

    this.client.emit('friend:message', new ReceivedFriendMessage(this.client, {
      content: decodeSTOMPMessageBody(message.body),
      author: friend,
      id: ensuredId,
      sentAt: new Date(message.time),
    }));
  }

  private async handleChatMessage(data: Extract<EOSConnectMessage, { type: 'social.chat.v1.NEW_MESSAGE' }>) {
    const { conversation, message } = data.payload;

    if (conversation.type === 'dm') {
      await this.handleFriendMessage(message, data.id);
      return;
    }

    if (conversation.type !== 'epic_party' || this.client.config.disablePartyService) return;

    const id = data.id ?? `${message.senderId}:${message.time}`;
    if (this.handledMessages.hasHandled(id)) return;
    this.handledMessages.markHandled(id);

    await this.client.partyLock.wait();
    const eosPartyId = conversation.conversationId.replace(/^ep-/, '');
    if (!this.client.party || this.client.party.eosId !== eosPartyId
      || message.senderId === this.client.user.self!.id) return;

    const author = this.client.party.members.get(message.senderId);
    if (!author) return;

    this.client.emit('party:member:message', new PartyMessage(this.client, {
      content: decodeSTOMPMessageBody(message.body),
      author,
      sentAt: new Date(message.time),
      id,
      party: this.client.party,
    }));
  }

  private async handlePresence(data: Extract<EOSConnectMessage, { type: 'presence.v1.UPDATE' }>) {
    await this.client.cacheLock.wait();

    const friend = await this.client.waitForFriend(data.payload.accountId);
    if (!friend) return;

    if (data.payload.status === 'offline') {
      friend.lastAvailableTimestamp = undefined;
      friend.party = undefined;
      this.client.emit('friend:offline', friend);
      return;
    }

    const presence = data.payload.perNs
      .find((entry) => entry.productId === 'Fortnite' || entry.ns === this.client.config.eosDeploymentId);
    if (!presence) return;

    const before = friend.presence;
    const after = new FriendPresence(this.client, presence, friend, presence.status);

    friend.lastAvailableTimestamp = Date.now();
    friend.presence = after;

    const rawParty = presence.props['party.joininfodata.286331153'];
    if (typeof rawParty === 'string') {
      const partyData = FriendPresence.parsePropsValue<FortnitePartyPresenceData>(rawParty);
      friend.party = new PresenceParty(this.client, partyData);
    }

    this.client.emit('friend:presence', before, after);
  }

  private async rebindEOSPartyConnection() {
    if (this.client.config.disablePartyService) return;

    if (!this.client.party?.eosId || !this.publicConnectionId) return;

    try {
      await this.client.eosParty.connect(this.client.party.eosId, this.publicConnectionId);
    } catch (error) {
      if (error instanceof RetryAbandonedError) return;
      await this.client.initParty();
    }
  }

  private async runPartyTransition<T>(transition: () => T): Promise<T | undefined> {
    if (this.client.config.disablePartyService) return undefined;

    await this.partyEventQueue.wait();
    try {
      await this.client.partyLock.wait();
      this.client.partyLock.lock();
      try {
        if (this.client.config.disablePartyService) return undefined;
        return transition();
      } finally {
        this.client.partyLock.unlock();
      }
    } finally {
      this.partyEventQueue.shift();
    }
  }

  private getCurrentParty(payload: EOSPartyScopedData): ClientParty | undefined {
    const partyId = payload.party_id;

    if (!partyId || !this.client.party || this.client.party.eosId !== partyId) return undefined;

    return this.client.party;
  }

  private async handlePartyMemberJoined(payload: EOSPartyMemberUpdateData) {
    await this.runPartyTransition(async () => {
      const party = this.getCurrentParty(payload);
      if (!party) return;

      const data: FortnitePartyMemberData = {
        id: payload.account_id,
        account_id: payload.account_id,
        account_dn: payload.account_dn,
        joined_at: payload.joined_at,
        updated_at: payload.updated_at,
        revision: 0,
        meta: {},
      };

      const memberId = payload.account_id;

      if (memberId === this.client.user.self!.id) {
        if (!party.me) party.members.set(memberId, new ClientPartyMember(party, data));
      } else {
        party.members.set(memberId, new PartyMember(party, data));
      }

      const member = party.members.get(memberId)!;
      this.client.xmpp.metadataStore.flushMemberMetadata(party, member);

      if (memberId === this.client.user.self!.id) await party.me.sendPatch(party.me.meta.schema);

      if (!member.displayName) await member.fetch();

      await this.client.setStatus();
      this.client.emit('party:member:joined', member);

      if (party.me.isLeader) await party.refreshSquadAssignments();
    });
  }

  private async handlePartyMemberRemoved(
    payload: EOSPartyMemberUpdateData,
    event: 'party:member:left' | 'party:member:expired' = 'party:member:left',
  ) {
    await this.runPartyTransition(async () => {
      if (!payload || typeof payload.account_id !== 'string') return;
      const party = this.getCurrentParty(payload);
      if (!party) return;
      this.client.xmpp.metadataStore.discardMemberMetadata(party.id, payload.account_id);

      const member = party.members.get(payload.account_id);
      if (!member) return;

      party.members.delete(member.id);

      await this.client.initParty(this.client.config.createParty, false);
      if (!this.client.party) await this.client.setStatus();
      this.client.emit(event, member);

      if (
        party.me?.isLeader && payload.account_id !== this.client.user.self!.id
        && party.id === this.client.party?.id
      ) await party.refreshSquadAssignments();
    });
  }

  private async handlePartyUpdated(payload: EOSPartyUpdateData) {
    await this.runPartyTransition(() => {
      const party = this.getCurrentParty(payload);
      if (!party) return;

      if (payload.revision <= party.eosRevision) return;

      const prevLeaderId = party.eosLeaderId;

      party.updateEOSData({
        ...payload,
        id: payload.party_id,
        config: {
          joinability: payload.party_privacy_type,
          max_size: payload.max_number_of_members,
        },
      });

      if (payload.party_lead !== prevLeaderId) {
        const member = party.members.get(payload.party_lead);
        if (!member) return;

        this.client.emit('party:member:promoted', member);
      }
    });
  }

  private async handlePartyKicked(payload: EOSPartyMemberUpdateData) {
    await this.runPartyTransition(async () => {
      const party = this.getCurrentParty(payload);
      if (!party) return;
      this.client.xmpp.metadataStore.discardMemberMetadata(party.id, payload.account_id);

      const member = party.members.get(payload.account_id);
      if (!member) return;

      party.members.delete(member.id);

      await this.client.initParty(this.client.config.createParty, false);
      if (!this.client.party) {
        await this.client.setStatus();
        return;
      }

      this.client.emit('party:member:kicked', member);

      if (
        party.me?.isLeader && payload.account_id !== this.client.user.self!.id
        && party.id === this.client.party?.id
      ) await party.refreshSquadAssignments();
    });
  }

  private async handlePartyInvite(payload: EOSPartyInviteData) {
    if (this.client.config.disablePartyService || this.client.listenerCount('party:invite') === 0
      || (payload.invitee_id && payload.invitee_id !== this.client.user.self!.id)) return;

    const sender = await this.client.waitForFriend(payload.inviter_id);
    if (!sender || this.client.config.disablePartyService) return;

    const invitation = new ReceivedPartyInvitation(this.client, sender, this.client.user.self!, payload);

    this.client.emit('party:invite', invitation);
  }

  private async handlePartyJoinRequest(payload: EOSPartyJoinRequestData) {
    if (this.client.config.disablePartyService) return;
    const requesterId = payload.requester_id
      ?? payload.sent_by
      ?? payload.inviter_id
      ?? payload.account_id;
    if (!requesterId || this.client.listenerCount('party:joinrequest') === 0) return;

    const sender = await this.client.waitForFriend(requesterId);
    if (!sender) return;

    const sentAt = payload.sent_at ?? payload.sent ?? new Date().toISOString();
    const expiresAt = payload.expires_at ?? new Date(Date.now() + JOIN_REQUEST_EXPIRATION_MS).toISOString();

    this.client.emit('party:joinrequest', new ReceivedPartyJoinRequest(this.client, sender, this.client.user.self!, {
      sent_at: sentAt,
      expires_at: expiresAt,
    }));
  }

  public async patchPresence(activityValue: string, props: EOSPresencePropsInGame, onlineType: PresenceOnlineType = 'online') {
    const { party } = this.client;
    const { publicConnectionId } = this;
    if (!publicConnectionId) return;

    try {
      await this.client.http.epicgamesRequest({
        method: 'PATCH',
        url: [
          Endpoints.EOS_PRESENCE,
          this.client.config.eosDeploymentId,
          this.client.user.self!.id,
          'presence',
          encodeURIComponent(publicConnectionId),
        ].join('/'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: onlineType, activity: { value: activityValue }, conn: { props: {} }, props,
        },
      }, AuthSessionStoreKey.FortniteEOS, () => (
        this.client.party === party && this.publicConnectionId === publicConnectionId
          ? RetryDecision.Retry
          : RetryDecision.Abandon
      ));
    } catch (error) {
      if (error instanceof RetryAbandonedError) return;
      throw error;
    }
  }

  public async patchInternalPresence(party?: Party | ClientParty) {
    const { privateConnectionId } = this;
    if (!privateConnectionId) return;

    try {
      await this.client.http.epicgamesRequest({
        method: 'PATCH',
        url: [
          Endpoints.EOS_PARTY.replace('/party', '/presence/internal/v1/_'),
          this.client.user.self!.id,
          'presence',
          encodeURIComponent(privateConnectionId),
        ].join('/'),
        headers: { 'Content-Type': 'application/json' },
        data: {
          status: 'online',
          activity: {},
          conn: { props: {} },
          ...party ? {
            party: {
              type: party.eosConfig.joinability,
              id: party.eosId,
              clientJoinable: party.eosConfig.joinability === 'OPEN',
              memberCount: party.size,
              timestamp: new Date().toISOString(),
            },
          } : {},
        },
      }, AuthSessionStoreKey.FortniteEOS, () => (
        this.client.party === party && this.privateConnectionId === privateConnectionId
          ? RetryDecision.Retry
          : RetryDecision.Abandon
      ));
    } catch (error) {
      if (error instanceof RetryAbandonedError) return;
      throw error;
    }
  }

  public disconnect() {
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
