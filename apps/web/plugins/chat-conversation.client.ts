import { ChatConversationManager } from "@/services/chat-conversation"

export default defineNuxtPlugin(() => {
  const chatConversationManager = new ChatConversationManager

  chatConversationManager.init()

  return {
    provide: {
      chatConversationManager
    }
  }
})