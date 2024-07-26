/**
 * Represents an error thrown because you tried to send a party chat message, but there is no chat yet, because you are the only person in the party
 */
class PartyChatConversationNotFound extends Error {
  constructor() {
    super();
    this.name = 'PartyChatConversationNotFound';
    this.message = 'There is no party chat conversation yet. You cannot send party chat messages when you are the only party member.';
  }
}

export default PartyChatConversationNotFound;
