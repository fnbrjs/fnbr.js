import BaseFriendMessage from './BaseFriendMessage';
import ClientUser from '../user/ClientUser';

/**
 * Represents a sent friend whisper message
 */
class SentFriendMessage extends BaseFriendMessage {
  /**
   * The message's author
   */
  public author!: ClientUser;
}

export default SentFriendMessage;
