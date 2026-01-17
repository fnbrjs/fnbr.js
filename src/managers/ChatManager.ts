import { generateKeyPair, randomUUID, sign } from 'crypto';
import { promisify } from 'util';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey, ConversationType, SignedMessageType } from '../../resources/enums';
import Base from '../Base';
import type { PublicKeyData } from '../../resources/httpResponses';
import type { KeyObject } from 'crypto';
import type { ChatMessagePayload } from '../../resources/structs';

// private scope
const generateCustomCorrelationId = () => `EOS-${Date.now()}-${randomUUID()}`;

/**
 * Represent's the client's chat manager (dm, party chat) via eos.
 */
class ChatManager extends Base {
  /**
   * DM conversations cache map (account id -> conversation id)
   */
  private dmConversations: Map<string, string> = new Map();

  /**
   * The private key for signing messages
   */
  private privateKey?: KeyObject;

  /**
   * The public key for verifying messages
   */
  private publicKey?: string;

  /**
   * The public key data registered on epic's servers
   */
  private publicKeyData?: PublicKeyData;

  /**
   * Whether the keypair for message signing exists
   */
  public get keypairExists() {
    return !!this.privateKey && !!this.publicKey;
  }

  /**
   * Whether the keypair has been registered on epic's servers
   */
  public get keypairRegistered() {
    return !!this.publicKeyData;
  }

  /**
   * Returns the chat namespace, this is the eos deployment id
   */
  public get namespace() {
    return this.client.config.eosDeploymentId;
  }

  /**
   * Sends a private message to the specified user
   * @param user the account id or displayname
   * @param message the message object
   * @returns the message id
   * @throws {UserNotFoundError} When the specified user was not found
   * @throws {EpicgamesAPIError} When the api request failed
   */
  public async whisperUser(user: string, message: ChatMessagePayload) {
    const accountId = await this.client.user.resolveId(user);

    const conversationId = await this.getDMConversationId(accountId);

    return this.sendMessageInConversation(
      conversationId,
      message,
      [accountId, this.client.user.self!.id],
      ConversationType.DirectMessage,
    );
  }

  /**
   * Sends a message in the specified conversation (e.g. party chat)
   * @param conversationId the conversation id, usually `p-[PARTYID]`
   * @param message the message object
   * @param allowedRecipients the account ids, that should receive the message
   * @returns the message id
   * @throws {EpicgamesAPIError}
   */
  public async sendMessageInConversation(
    conversationId: string,
    message: ChatMessagePayload,
    allowedRecipients: string[],
    conversationType: ConversationType,
  ) {
    const correlationId = generateCustomCorrelationId();

    const { body, signature } = await this.createSignedMessage(
      conversationId,
      message.body,
      conversationType === ConversationType.DirectMessage ? SignedMessageType.Persistent : SignedMessageType.Party,
    );

    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_CHAT}/v1/public/${conversationType === ConversationType.DirectMessage ? '_' : this.namespace}`
        + `/conversations/${conversationId}/messages?fromAccountId=${this.client.user.self!.id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Epic-Correlation-ID': correlationId,
      },
      data: {
        allowedRecipients,
        message: {
          body,
        },
        isReportable: false,
        metadata: {
          TmV: '2',
          Pub: this.publicKeyData!.jwt,
          Sig: signature,
          NPM: conversationType === ConversationType.Party ? '1' : undefined,
          PlfNm: this.client.config.platform,
          PlfId: this.client.user.self!.id,
        },
      },
    }, AuthSessionStoreKey.FortniteEOS);

    return correlationId;
  }

  public async createDMConversation(recepientId: string, createIfExists = false) {
    return this.client.http.epicgamesRequest<{
      conversationId: string;
    }>({
      method: 'POST',
      url: `${Endpoints.EOS_CHAT}/v1/public/_/conversations?createIfExists=${createIfExists}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        title: '',
        type: 'dm',
        members: [this.client.user.self!.id, recepientId],
      },
    }, AuthSessionStoreKey.FortniteEOS);
  }

  /**
   * Ensures that message signing is possible
   */
  public async ensureMessageSigning() {
    if (!this.keypairExists) {
      await this.generateKeypair();
    }

    if (!this.keypairRegistered) {
      await this.registerKeypair();
    }
  }

  /**
   * Resolves the conversation id for a dm with the specified user
   * @param recepientId The account id of the recepient
   * @returns The conversation id
   */
  private async getDMConversationId(recepientId: string) {
    if (this.dmConversations.has(recepientId)) {
      return this.dmConversations.get(recepientId)!;
    }

    const conversationData = await this.createDMConversation(recepientId);
    this.dmConversations.set(recepientId, conversationData.conversationId);

    return conversationData.conversationId;
  }

  /**
   * Signs a message for the specified conversation
   * @param conversationId The conversation id
   * @param content The message content
   * @param type The signed message type
   */
  private async createSignedMessage(conversationId: string, content: string, type: SignedMessageType) {
    await this.ensureMessageSigning();

    const timestamp = Date.now();

    const messageInfo = {
      mid: randomUUID(),
      sid: this.client.user.self!.id,
      rid: conversationId,
      msg: content,
      tst: timestamp,
      seq: 1,
      rec: false,
      mts: [],
      cty: type,
    };

    const body = Buffer.from(JSON.stringify(messageInfo), 'utf-8').toString('base64');
    const messageToSign = Buffer.concat([Buffer.from(body, 'utf-8'), Buffer.from([0])]);

    const signature = sign(null, messageToSign, this.privateKey!).toString('base64');

    return { body, signature };
  }

  /**
   * Generates a ed25519 keypair for message signing
   */
  private async generateKeypair() {
    const { privateKey, publicKey } = await promisify(generateKeyPair)('ed25519');

    const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
    const rawPublicKey = spkiDer.subarray(spkiDer.length - 32);

    this.privateKey = privateKey;
    this.publicKey = rawPublicKey.toString('base64');
  }

  /**
   * Registers the public key on epic's servers
   */
  private async registerKeypair() {
    const publicKeyData = await this.client.http.epicgamesRequest<PublicKeyData>({
      method: 'POST',
      url: `${Endpoints.PUBLICKEY}/v2/publickey`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        key: this.publicKey,
        algorithm: 'ed25519',
      },
    }, AuthSessionStoreKey.Fortnite);

    this.publicKeyData = publicKeyData;
  }
}

export default ChatManager;
