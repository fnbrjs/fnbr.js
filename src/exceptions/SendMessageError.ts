import type { SentMessageType } from '../../resources/structs';
import type ClientParty from '../structures/party/ClientParty';
import type Friend from '../structures/friend/Friend';

/**
 * Represets an error thrown because a user does not exist
 */
class SendMessageError extends Error {
  /**
   * The message related to this error
   */
  public message: string;

  /**
   * The message's type
   */
  public type: string;

  /**
   * The message's target
   */
  public target: Friend | ClientParty;

  /**
   * @param message The message related to this error
   * @param type The message's type
   * @param target The message's target
   */
  constructor(message: string, type: SentMessageType, target: Friend | ClientParty) {
    super();
    this.name = 'SendMessageError';

    this.message = message;
    this.type = type;
    this.target = target;
  }
}

export default SendMessageError;
