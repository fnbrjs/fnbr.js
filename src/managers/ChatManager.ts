import { randomUUID } from 'crypto';
import Endpoints from '../../resources/Endpoints';
import { AuthSessionStoreKey } from '../../resources/enums';
import Base from '../Base';
import UserNotFoundError from '../exceptions/UserNotFoundError';
import type { ChatMessagePayload } from '../../resources/structs';

const generateCustomCorrelationId = () => `EOS-${Date.now()}-${randomUUID()}`;

class ChatManager extends Base {
  private get namespace() {
    return this.client.config.eosDeploymentId;
  }

  public async whisperUser(user: string, message: ChatMessagePayload) {
    const accountId = await this.client.user.resolveId(user);

    if (!accountId) {
      throw new UserNotFoundError(user);
    }

    const correlationId = generateCustomCorrelationId();

    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_CHAT}/v1/public/${this.namespace}/whisper/${this.client.user.self!.id}/${accountId}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Epic-Correlation-ID': correlationId,
      },
      data: {
        message,
      },
    }, AuthSessionStoreKey.FortniteEOS);

    return correlationId;
  }

  public async sendMessageInConversation(conversationId: string, message: ChatMessagePayload, allowedRecipients: string[]) {
    const correlationId = generateCustomCorrelationId();

    await this.client.http.epicgamesRequest({
      method: 'POST',
      url: `${Endpoints.EOS_CHAT}/v1/public/${this.namespace}/conversations/${conversationId}/messages?fromAccountId=${this.client.user.self!.id}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Epic-Correlation-ID': correlationId,
      },
      data: {
        allowedRecipients,
        message,
      },
    }, AuthSessionStoreKey.FortniteEOS);

    return correlationId;
  }
}

export default ChatManager;
