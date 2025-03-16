import { ChatConversationClientInterface, type ChatConversationClientInterfaceOptions } from '@/services/chat-conversation'

export const useChatConversation = (opts?: ChatConversationClientInterfaceOptions) => {
  if (!opts) opts = {}

  const app = useNuxtApp()
  const store = useChatConversationState()
  const client = ref<ChatConversationClientInterface>()
  const loaded = ref(false)

  onBeforeMount(() => {
    const _client = new ChatConversationClientInterface(app.$chatConversationManager, opts)
    let conversationLoaded = (opts.conversationId) ? store.chatConversationLoaded.find(c => c.data.id === opts.conversationId) : undefined
    if (conversationLoaded) _client.conversation.data = conversationLoaded.data
    client.value = _client
    if (!conversationLoaded) {
      store.chatConversationLoaded.push(client.value.conversation)
    }
  })

  onMounted(() => {
    loaded.value = true
  })

  return {
    client,
    loaded,
  }
}