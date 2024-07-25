import { Client as StompClient, Versions } from '@stomp/stompjs';
import WebSocket, { type ErrorEvent } from 'ws';
import Base from '../Base';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import StompConnectionError from '../exceptions/StompConnectionError';
import Endpoints from '../../resources/Endpoints';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import PartyMessage from '../structures/party/PartyMessage';
import type { EOSConnectMessage } from '../../resources/structs';
import type { IMessage } from '@stomp/stompjs';
import type Client from '../Client';

/**
 * Represents the client's EOS Connect STOMP manager (i.e. chat messages)
 */
class EOSConnect extends Base {
  /**
   * private stomp connection
   */
  private stompConnection?: StompClient;

  /**
   * private stomp connection id (i.e. used for eos presence)
   */
  private stompConnectionId?: string;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.stompConnection = undefined;
    this.stompConnectionId = undefined;
  }

  /**
   * Whether the internal websocket is connected
   */
  public get isConnected() {
    return !!this.stompConnection && this.stompConnection.connected;
  }

  /**
   * Returns the eos stomp connection id
   */
  public get connectionId() {
    return this.stompConnectionId;
  }

  /**
   * connect to the eos connect stomp server
   */
  public async connect() {
    if (!this.client.auth.sessions.has(AuthSessionStoreKey.FortniteEOS)) {
      throw new AuthenticationMissingError(AuthSessionStoreKey.FortniteEOS);
    }

    return new Promise((resolve, reject) => {
      const brokerURL = `wss://${Endpoints.EOS_STOMP}`;

      this.stompConnection = new StompClient({
        brokerURL,
        stompVersions: new Versions([Versions.V1_0, Versions.V1_1, Versions.V1_2]),
        heartbeatOutgoing: 30_000,
        heartbeatIncoming: 0,
        webSocketFactory: () => new WebSocket(
          brokerURL,
          {
            headers: {
              Authorization: `Bearer ${this.client.auth.sessions.get(AuthSessionStoreKey.FortniteEOS)!.accessToken}`,
              'Sec-Websocket-Protocol': 'v10.stomp,v11.stomp,v12.stomp',
              'Epic-Connect-Protocol': 'stomp',
              'Epic-Connect-Device-Id': '',
            },
          },
        ),
        debug: (str) => {
          this.client.config.stompEosConnectDebug?.(str);
        },
        onConnect: () => {
          this.setupSubscription(resolve, reject);
        },
        onStompError: (frame) => {
          reject(new StompConnectionError(frame.body, -1));
        },
        onWebSocketError: (event) => {
          const errorEvent = <ErrorEvent>event;

          if (errorEvent.error || errorEvent.message) {
            let error: Error = undefined!;

            if (errorEvent.error instanceof Error) {
              error = errorEvent.error;
            } else {
              error = new Error(errorEvent.message);
            }

            error.message += ' (eos connect stomp)';

            reject(error);
          }
        },
      });

      this.client.debug('[STOMP EOS Connect] Connecting...');

      this.stompConnection.activate();
    });
  }

  /**
   * Disconnects the stomp websocket client.
   * Also performs a cleanup
   */
  public disconnect() {
    if (!this.stompConnection) return;

    this.stompConnection.forceDisconnect();
    this.stompConnection.deactivate();
    this.stompConnection = undefined;
    this.stompConnectionId = undefined;

    this.client.debug('[STOMP EOS Connect] Disconnected');
  }

  /**
   * Sets up the subscription for the deployment
   * @param connectionResolve connect promise resolve
   * @param connectionReject connect promise reject
   */
  private setupSubscription(connectionResolve: (value: unknown) => void, connectionReject: (reason?: unknown) => void) {
    this.stompConnection!.subscribe(
      `${this.client.config.eosDeploymentId}/account/${this.client.user.self!.id}`,
      async (message: IMessage) => {
        if (!message.headers['content-type']?.includes('application/json')) {
          return;
        }

        const messageData = <EOSConnectMessage>JSON.parse(message.body);

        this.client.config.stompEosConnectDebug?.(message.body);

        this.client.debug(`new message '${messageData.type}' - ${message.body}`, 'eos-connect');

        switch (messageData.type) {
          case 'core.connect.v1.connected': {
            this.stompConnectionId = messageData.connectionId!;

            this.client.debug(`[STOMP EOS Connect] Connected as ${messageData.connectionId!}`);

            connectionResolve(messageData.connectionId!);
            break;
          }

          case 'core.connect.v1.connect-failed': {
            this.client.debug(`failed connecting to eos connect: ${messageData.statusCode} - ${messageData.message}`);

            connectionReject(new StompConnectionError(messageData.message, messageData.statusCode));
            break;
          }

          case 'social.chat.v1.NEW_WHISPER': {
            const { senderId, body, time } = messageData.payload.message;
            const friend = this.client.friend.list.get(senderId);

            if (!friend || senderId === this.client.user.self!.id) {
              return;
            }

            const friendMessage = new ReceivedFriendMessage(this.client, {
              content: body || '',
              author: friend,
              id: messageData.id!,
              sentAt: new Date(time),
            });

            this.client.emit('friend:message', friendMessage);
            break;
          }

          case 'social.chat.v1.NEW_MESSAGE': {
            if (messageData.payload.conversation.type !== 'party') {
              return;
            }

            await this.client.partyLock.wait();

            const { conversation: { conversationId }, message: { senderId, body, time } } = messageData.payload;
            const partyId = conversationId.replace('p-', '');

            if (!this.client.party
              || this.client.party.id !== partyId
              || senderId === this.client.user.self!.id
            ) {
              return;
            }

            const authorMember = this.client.party.members.get(senderId);

            if (!authorMember) {
              return;
            }

            const partyMessage = new PartyMessage(this.client, {
              content: body || '',
              author: authorMember,
              sentAt: new Date(time),
              id: messageData.id!,
              party: this.client.party,
            });

            this.client.emit('party:member:message', partyMessage);
            break;
          }
        }
      },
      {
        id: 'sub-0',
      },
    );
  }
}

export default EOSConnect;
