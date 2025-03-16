import type { ChatConversation } from "@nakka/kit";

export interface ChatConversationState {
  chatConversationLoaded: ChatConversation[]
}

export const useChatConversationState = defineStore('alerts', {
  state: (): ChatConversationState => ({
    chatConversationLoaded: []
  }),
})