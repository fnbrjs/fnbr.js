/* eslint-disable @typescript-eslint/indent */
interface BaseEOSConnectMessage {
  correlationId: string;
  timestamp: number; // unix
  id?: string;
  connectionId?: string;
}

export interface EOSConnectCoreConnected extends BaseEOSConnectMessage {
  type: 'core.connect.v1.connected';
}

export interface EOSConnectCoreConnectFailed extends BaseEOSConnectMessage {
  message: string;
  statusCode: number; // i.e. 4005
  type: 'core.connect.v1.connect-failed';
}

export interface EOSConnectChatMemberLeftMessage extends BaseEOSConnectMessage {
  payload: {
    // deployment id
    namespace: string;
    conversationId: string;
    members: string[];
  };
  type: 'social.chat.v1.MEMBERS_LEFT';
}

export interface EOSConnectChatNewMsgMessage extends BaseEOSConnectMessage {
  payload: {
    // deployment id
    namespace: string;
    conversation: {
      conversationId: string;
      type: string; // i.e. 'party
    };
    message: {
      body: string;
      senderId: string;
      time: number;
    }
  };
  type: 'social.chat.v1.NEW_MESSAGE';
}

export interface EOSConnectChatConversionCreatedMessage extends BaseEOSConnectMessage {
  payload: {
    // deployment id
    namespace: string;
    conversationId: string;
    type: string; // i.e. 'party'
    members: string[];
  };
  type: 'social.chat.v1.CONVERSATION_CREATED';
}

export interface EOSConnectChatNewWhisperMessage extends BaseEOSConnectMessage {
  payload: {
    // deployment id
    namespace: string;
    message: {
      body: string;
      senderId: string;
      time: number;
    }
  };
  type: 'social.chat.v1.NEW_WHISPER';
}

export type EOSConnectMessage =
  // Core
  EOSConnectCoreConnected
  | EOSConnectCoreConnectFailed
  // Social chat
  | EOSConnectChatConversionCreatedMessage
  | EOSConnectChatNewMsgMessage
  | EOSConnectChatMemberLeftMessage
  | EOSConnectChatNewWhisperMessage;

export default {};
