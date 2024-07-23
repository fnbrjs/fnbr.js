import { Client as StompClient, Versions } from '@stomp/stompjs';
import WebSocket from 'ws';
import Base from '../Base';
import { AuthSessionStoreKey } from '../../resources/enums';
import AuthenticationMissingError from '../exceptions/AuthenticationMissingError';
import Endpoints from '../../resources/Endpoints';
import AuthClients from '../../resources/AuthClients';
import ReceivedFriendMessage from '../structures/friend/ReceivedFriendMessage';
import type { EOSConnectMessage } from '../structures/eos/connect';
import type { IMessage } from '@stomp/stompjs';
import type Client from '../Client';
import type Friend from '../structures/friend/Friend';

/**
 * Represents the client's EOS Connect STOMP manager (i.e. chat messages)
 */
class EOSConnect extends Base {
  private wsConnection?: StompClient;

  /**
   * @param client The main client
   */
  constructor(client: Client) {
    super(client);

    this.wsConnection = undefined;
  }

  public async connect() {
    if (!this.client.auth.sessions.has(AuthSessionStoreKey.Fortnite)) {
      throw new AuthenticationMissingError(AuthSessionStoreKey.Fortnite);
    }

    // own func
    const { code: exchangeCode } = await this.client.http.epicgamesRequest({
      url: Endpoints.OAUTH_EXCHANGE,
      headers: {
        Authorization: `bearer ${this.client.auth.sessions.get(AuthSessionStoreKey.Fortnite)!.accessToken}`,
      },
    });

    // own func - maybe actual auth like others?
    const epicIdAuth = await this.client.http.epicgamesRequest<{ access_token: string }>({
      method: 'POST',
      url: 'https://api.epicgames.dev/epic/oauth/v2/token',
      headers: {
        Authorization:
          `basic ${Buffer.from(`${AuthClients.fortniteIOSGameClient.clientId}:${AuthClients.fortniteIOSGameClient.secret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: new URLSearchParams({
        grant_type: 'exchange_code',
        exchange_code: exchangeCode,
        token_type: 'epic_id',
        deployment_id: this.client.config.eosDeploymentId,
      }).toString(),
    });

    console.log(epicIdAuth);

    const brokerURL = `wss://${Endpoints.STOMP_EOS_CONNECT_SERVER}`;

    this.wsConnection = new StompClient({
      brokerURL,
      stompVersions: new Versions([Versions.V1_0, Versions.V1_1, Versions.V1_2]),
      heartbeatOutgoing: 30_000,
      heartbeatIncoming: 0,
      webSocketFactory: () => new WebSocket(
        brokerURL,
        {
          headers: {
            Authorization: `Bearer ${epicIdAuth.access_token}`,
            'Epic-Connect-Protocol': 'stomp',
            'Epic-Connect-Device-Id': '',
          },
        },
      ),
      debug: (str) => {
        console.log(`STOMP: ${str}`);
      },
      onConnect: (idk) => {
        console.log(idk);

        this.setupSubscription();
      },
      onStompError(frame) {
        console.log(frame.command);
        console.log(frame.headers);
        console.log(frame.body);
      },
      onChangeState(state) {
        console.log('state', state);
      },
      onDisconnect(frame) {
        console.log(frame);
      },
      onUnhandledFrame(frame) {
        console.log('onUnhandledFrame', frame.command, frame.body);
      },
      onUnhandledReceipt(frame) {
        console.log(frame);
      },
      onWebSocketError: (evt) => {
        console.log(evt);
      },
      onUnhandledMessage: (msg) => {
        console.log(msg.command, msg.command);
      },
    });

    console.log(this.wsConnection);

    this.wsConnection.activate();
  }

  private setupSubscription() {
    this.wsConnection!.subscribe(
      `${this.client.config.eosDeploymentId}/account/${this.client.user.self!.id}`,
      this.subscriptionCallback,
      {
        id: 'sub-0',
      },
    );
  }

  // eslint-disable-next-line class-methods-use-this
  private async subscriptionCallback(message: IMessage) {
    const isJson = message.headers['content-type']?.includes('application/json');

    if (!isJson) {
      return;
    }

    const messageData = <EOSConnectMessage>JSON.parse(message.body);

    console.log(messageData);

    this.client.debug(`new message '${messageData.type}' - ${message.body}`, 'eos-connect');

    switch (messageData.type) {
      case 'social.chat.v1.NEW_WHISPER': {
        // const friend = await this.client.xmpp.waitForFriend(m.from.split('@')[0]);
        // if (!friend) return;

        const friendMessage = new ReceivedFriendMessage(this.client, {
          // TODO: FRIEND via xmpp???
          content: messageData.payload.message.body || '', author: <Friend>{}, id: messageData.id!, sentAt: new Date(),
        });

        this.client.emit('friend:message', friendMessage);
        break;
      }
    }
  }
}

export default EOSConnect;
