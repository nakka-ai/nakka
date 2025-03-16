export const useAppLayout = () => {
  const sidebarVisible = useState('app.layout.sidebarVisible', () => false)
  const chatConversationExpandedContainer = useState('app.layout.chatConversationExpandedContainer', () => false)

  if (import.meta.client) {
    sidebarVisible.value = (localStorage.getItem('app.layout.sidebarVisible') === 'true') || false
    chatConversationExpandedContainer.value = (localStorage.getItem('app.layout.chatConversationExpandedContainer') === 'true') || false
  }

  watch(sidebarVisible, () => localStorage.setItem('app.layout.sidebarVisible', sidebarVisible.value.toString()))
  watch(chatConversationExpandedContainer, () => localStorage.setItem('app.layout.chatConversationExpandedContainer', chatConversationExpandedContainer.value.toString()))

  const toggleSidebar = () => {
    sidebarVisible.value = !sidebarVisible.value
  }
  const toggleChatConversationExpandedContainer = () => {
    chatConversationExpandedContainer.value = !chatConversationExpandedContainer.value
  }

  return {
    sidebarVisible,
    chatConversationExpandedContainer,
    toggleSidebar,
    toggleChatConversationExpandedContainer,
  }
}