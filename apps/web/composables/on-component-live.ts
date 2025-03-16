import { ChatConversationClientInterface } from '@/services/chat-conversation'

export const onComponentLive = (func: () => () => void) => {
  onMounted(() => {
    const live = func()
    onBeforeUnmount(() => {
      live()
    })
  })
}