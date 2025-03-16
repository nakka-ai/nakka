import Dexie from 'dexie'
import { ChatConversation } from '@nakka/kit'

export class ChatConversationManager {
  db!: Dexie
  
  init() {
    this.db = new Dexie('chat-conversations')
    this.db.version(1).stores({
      conversations: 'id, title, rootNodeId, currentNodeId, updateTime'
    })
  }
}

export interface ChatConversationClientInterfaceOptions {
  // master: boolean
  conversationId?: string
}

export class ChatConversationClientInterface {
  conversation: ChatConversation

  constructor(
    public manager: ChatConversationManager,
    public options: ChatConversationClientInterfaceOptions
  ) {
    this.conversation = new ChatConversation()
  }
}