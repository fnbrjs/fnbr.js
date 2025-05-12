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
import type { StompMessageData } from './STOMPMessage';
import type { EOSConnectMessage } from '../../resources/structs';
import type Client from '../Client';

/**
 * Represents the client's EOS Connect STOMP manager (i.e. chat messages)
 */
class STOMP extends Base {
  /**
   * The STOMP websocket client
   */
  private connection?: WebSocket;

  /**
   * The stomp connection id (i.e. used for eos presence)
   */
  public connectionId?: string;

  /**
   * The stomp heartbeat interval
   */
  private pingInterval?: NodeJS.Timeout;

  /**
   * The amount of times the stomp connection has been retried
   */
  private connectionRetryCount: number;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.connection = undefined;
    this.pingInterval = undefined;
    this.connectionId = undefined;
    this.connectionRetryCount = 0;
  }

  /**
   * Whether the internal websocket is connected
   */
  public get isConnected() {
    return this.connection && this.connection.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to the STOMP server
   * @throws {AuthenticationMissingError} When there is no EOS auth to use for STOMP auth
   * @throws {STOMPConnectionError} When the connection failed for any reason
   */
  public async connect() {
    if (!this.client.auth.sessions.has(AuthSessionStoreKey.FortniteEOS)) {
      throw new AuthenticationMissingError(AuthSessionStoreKey.FortniteEOS);
    }

    this.client.debug('[STOMP] Connecting...');

    const connectionStartTime = Date.now();

    this.connection = new WebSocket(`wss://${Endpoints.EOS_STOMP}`, {
      headers: {
        Authorization: `Bearer ${this.client.auth.sessions.get(AuthSessionStoreKey.FortniteEOS)!.accessToken}`,
        'Sec-Websocket-Protocol': 'v10.stomp,v11.stomp,v12.stomp',
        'Epic-Connect-Device-Id': ' ',
        'Epic-Connect-Protocol': 'stomp',
      },
    });

    return new Promise<void>((res, rej) => {
      const connectionTimeout = setTimeout(() => {
        this.disconnect();
        rej(new STOMPConnectionTimeoutError(this.client.config.stompConnectionTimeout));
      }, this.client.config.stompConnectionTimeout);

      this.connection!.once('open', () => {
        clearTimeout(connectionTimeout);

        this.sendMessage({
          command: 'CONNECT',
          headers: {
            'accept-version': '1.0,1.1,1.2',
            'heart-beat': '35000,0',
          },
        });

        this.registerEvents(res, rej, connectionStartTime);
      });

      this.connection!.once('error', (err) => {
        this.client.debug(`[STOMP] Connection failed: ${err.message}`);

        clearTimeout(connectionTimeout);
        rej(new STOMPConnectionError(err.message));
      });
    });
  }

  /**
   * Registers the events for the STOMP connection
   */
  private registerEvents(resolve: () => void, reject: (reason?: unknown) => void, connectionStartTime: number) {
    this.connection!.on('close', async (code, reason) => {
      this.disconnect();

      if (this.connectionRetryCount < 2) {
        this.client.debug('[STOMP] Disconnected, reconnecting in 5 seconds...');
        this.connectionRetryCount += 1;

        await new Promise((res) => setTimeout(res, 5000));
        await this.connect();
      } else {
        this.client.debug('[STOMP] Disconnected, retry limit reached');
        this.connectionRetryCount = 0;
        throw new STOMPConnectionError(`STOMP WS disconnected, retry limit reached. Reason: ${reason}`, code);
      }
    });

    this.connection!.on('message', async (d: any) => {
      const message = STOMPMessage.fromString(d.toString());

      switch (message.command) {
        case 'CONNECTED':
          this.pingInterval = setInterval(() => this.connection!.send('\n'), 35000);

          this.sendMessage({
            command: 'SUBSCRIBE',
            headers: {
              id: 'sub-0',
              destination: `${this.client.config.eosDeploymentId}/account/${this.client.user.self!.id}`,
            },
          });
          break;
        case 'MESSAGE': {
          if (!message.body) break;

          const data: EOSConnectMessage = JSON.parse(message.body);

          switch (data.type) {
            case 'core.connect.v1.connected':
              this.client.debug(`[STOMP] Successfully connected (${((Date.now() - connectionStartTime) / 1000).toFixed(2)}s)`);
              this.connectionId = data.connectionId;
              this.connectionRetryCount = 0;
              resolve();
              break;
            case 'core.connect.v1.connect-failed':
              this.client.debug(`[STOMP] Connection failed: ${data.statusCode} - ${data.message}`);

              reject(new STOMPConnectionError(data.message, data.statusCode));
              break;
            case 'social.chat.v1.NEW_WHISPER': {
              const { senderId, body, time } = data.payload.message;
              const friend = this.client.friend.list.get(senderId);

              if (!friend || senderId === this.client.user.self!.id) return;

              const friendMessage = new ReceivedFriendMessage(this.client, {
                content: body ?? '',
                author: friend,
                id: data.id!,
                sentAt: new Date(time),
              });

              this.client.emit('friend:message', friendMessage);
              break;
            }
            case 'social.chat.v1.NEW_MESSAGE': {
              if (data.payload.conversation.type !== 'party') return;

              await this.client.partyLock.wait();

              const { conversation: { conversationId }, message: { senderId, body, time } } = data.payload;
              const partyId = conversationId.replace('p-', '');

              if (!this.client.party || this.client.party.id !== partyId || senderId === this.client.user.self!.id) {
                return;
              }

              const authorMember = this.client.party.members.get(senderId);
              if (!authorMember) return;

              const partyMessage = new PartyMessage(this.client, {
                content: body ?? '',
                author: authorMember,
                sentAt: new Date(time),
                id: data.id!,
                party: this.client.party,
              });

              this.client.emit('party:member:message', partyMessage);
              break;
            }
            default:
              this.client.debug(`[STOMP] Unknown message type: ${data.type} ${message.body}`);
          }
        } break;
        default:
          this.client.debug(`[STOMP] Unknown command: ${message.command} ${message.body ?? 'no body'}`);
      }
    });
  }

  /**
   * Disconnects the STOMP client.
   * Also performs a cleanup
   */
  public async disconnect() {
    if (!this.connection) return;

    clearInterval(this.pingInterval);
    this.pingInterval = undefined;

    this.connection.removeAllListeners();
    this.connection.close();
    this.connection = undefined;

    this.connectionId = undefined;
  }

  /**
   * Sends a message to the STOMP server
   * @param message The message to send
   */
  private sendMessage(message: StompMessageData) {
    this.connection!.send(new STOMPMessage(message).toString());
  }
}

export default STOMP;
