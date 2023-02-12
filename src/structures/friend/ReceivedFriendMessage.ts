import BaseFriendMessage from './BaseFriendMessage';
import type Friend from './Friend';

/**
 * Represents a received friend whisper message
 */
class ReceivedFriendMessage extends BaseFriendMessage {
  /**
   * The message's author
   */
  public author!: Friend;

  /**
   * Replies to this whisper message
   * @param content The message that will be sent
   * @throws {FriendNotFoundError} The user is not friends with the client
   */
  public reply(content: string) {
    return this.client.friend.sendMessage(this.author.id, content);
  }
}

export default ReceivedFriendMessage;
