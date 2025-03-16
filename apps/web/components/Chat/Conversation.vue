<script lang="ts" setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import type { ChatConversationData } from '@nakka/kit'

const $appLayout = useAppLayout()
const sidePanelShow = ref(false)

const { client, loaded } = useChatConversation()
const nodes = computed(() => client.value?.conversation.nodes || [])

const initDummyData = async () => {
  if (!client.value) return
  client.value.conversation.parse({
    id: client.value.conversation.generateId(),
    title: 'Example Conversation with Branches',
    createdAt: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    mapping: [
      {
        "id": "8fefc9b3-8612-4041-b204-8cfd2f49673b",
        "children": [
          "0809e614-d572-4d2e-aaae-20950952b306",
          "6ca537a2-dee1-4f9b-92c8-3305ee5a8ed9"
        ]
      },
      {
        "id": "0809e614-d572-4d2e-aaae-20950952b306",
        parent: "8fefc9b3-8612-4041-b204-8cfd2f49673b",
        "children": [
          "0ecb6dff-df64-46ef-8c88-87a443d512ee"
        ],
        "message": {
          "id": "0809e614-d572-4d2e-aaae-20950952b306",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "A adalah 10"
        }
      },
      {
        "id": "0ecb6dff-df64-46ef-8c88-87a443d512ee",
        "parent": "0809e614-d572-4d2e-aaae-20950952b306",
        "children": [
          "5cebb715-955d-451a-ba8a-afff1b3691fb",
          "0bef2fde-1c70-4a8e-b235-9e7d13a552d1"
        ],
        "message": {
          "id": "0ecb6dff-df64-46ef-8c88-87a443d512ee",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "Oke, A = 10. Ada yang mau dihitung atau diproses lebih lanjut? 😊"
        }
      },
      {
        "id": "6ca537a2-dee1-4f9b-92c8-3305ee5a8ed9",
        "parent": "8fefc9b3-8612-4041-b204-8cfd2f49673b",
        "children": [
          "a84ab506-a085-4234-9e35-30c9107855ef"
        ],
        "message": {
          "id": "6ca537a2-dee1-4f9b-92c8-3305ee5a8ed9",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "A adalah 15"
        }
      },
      {
        "id": "a84ab506-a085-4234-9e35-30c9107855ef",
        "parent": "6ca537a2-dee1-4f9b-92c8-3305ee5a8ed9",
        "children": [
          "46eb882f-0302-45e1-8827-de9d9e949fc7"
        ],
        "message": {
          "id": "a84ab506-a085-4234-9e35-30c9107855ef",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "-"
        }
      },
      {
        "id": "46eb882f-0302-45e1-8827-de9d9e949fc7",
        "parent": "a84ab506-a085-4234-9e35-30c9107855ef",
        "children": [
          "e94dbb1e-9177-41b7-a471-51486adb9e45"
        ],
        "message": {
          "id": "46eb882f-0302-45e1-8827-de9d9e949fc7",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "Oke, A = 15. Apa yang ingin kamu lakukan dengan nilai ini? 😊"
        }
      },
      {
        "id": "e94dbb1e-9177-41b7-a471-51486adb9e45",
        "parent": "46eb882f-0302-45e1-8827-de9d9e949fc7",
        "children": [
          "f26e246d-2d10-4435-a131-b40c911dade7"
        ],
        "message": {
          "id": "e94dbb1e-9177-41b7-a471-51486adb9e45",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "B adalah 20"
        }
      },
      {
        "id": "f26e246d-2d10-4435-a131-b40c911dade7",
        "parent": "e94dbb1e-9177-41b7-a471-51486adb9e45",
        "children": [],
        "message": {
          "id": "f26e246d-2d10-4435-a131-b40c911dade7",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "Oke, sekarang A = 15 dan B = 20. Mau dihitung apa nih? 😁"
        }
      },
      {
        "id": "5cebb715-955d-451a-ba8a-afff1b3691fb",
        "parent": "0ecb6dff-df64-46ef-8c88-87a443d512ee",
        "children": [
          "eddcafbd-01d1-4a15-be7a-a3189ae2f111"
        ],
        "message": {
          "id": "5cebb715-955d-451a-ba8a-afff1b3691fb",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "B adalah 30"
        }
      },
      {
        "id": "eddcafbd-01d1-4a15-be7a-a3189ae2f111",
        "parent": "5cebb715-955d-451a-ba8a-afff1b3691fb",
        "children": [],
        "message": {
          "id": "eddcafbd-01d1-4a15-be7a-a3189ae2f111",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "Sekarang kita punya:  \n- A = 10  \n- B = 30  \n\nMau dihitung apa nih? 😃"
        }
      },
      {
        "id": "0bef2fde-1c70-4a8e-b235-9e7d13a552d1",
        "parent": "0ecb6dff-df64-46ef-8c88-87a443d512ee",
        "children": [
          "75b96dac-6836-4494-8422-2da037ade0ef"
        ],
        "message": {
          "id": "0bef2fde-1c70-4a8e-b235-9e7d13a552d1",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "B adalah 66"
        }
      },
      {
        "id": "75b96dac-6836-4494-8422-2da037ade0ef",
        "parent": "0bef2fde-1c70-4a8e-b235-9e7d13a552d1",
        "children": [
          "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19"
        ],
        "message": {
          "id": "75b96dac-6836-4494-8422-2da037ade0ef",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "Sekarang A = 10 dan B = 66. Ada operasi yang ingin kamu lakukan dengan kedua nilai ini? 😊"
        }
      },
      {
        "id": "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19",
        "parent": "75b96dac-6836-4494-8422-2da037ade0ef",
        "children": [
          "422fb799-177f-42ad-bb4d-e22a7fe72e02",
          "111fb799-aw23-42ad-bb4d-e22a7fe72e02",
          "222fb799-aw23-42ad-bb4d-e22a7fe72e02"
        ],
        "message": {
          "id": "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "buat kan gambar kucing"
        }
      },
      {
        "id": "422fb799-177f-42ad-bb4d-e22a7fe72e02",
        "parent": "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19",
        "children": [
          // "ea5d2e2d-cadf-4ffa-a78a-53c85b8b91e8"
        ],
        "message": {
          "id": "422fb799-177f-42ad-bb4d-e22a7fe72e02",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "{\"prompt\":\"A cute and fluffy cat sitting on a wooden floor, looking up with big adorable eyes. The cat has soft fur with a mix of white and orange patches. The background is softly blurred, giving a cozy and warm indoor atmosphere.\",\"size\":\"1024x1024\"}"
        }
      },
      {
        "id": "111fb799-aw23-42ad-bb4d-e22a7fe72e02",
        "parent": "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19",
        "children": [
          "555fb799-aw23-42ad-bb4d-e22a7fe72e02"
        ],
        "message": {
          "id": "111fb799-aw23-42ad-bb4d-e22a7fe72e02",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "{\"prompt\":\"Seekor kucing yang imut dan berbulu lebat sedang duduk di atas lantai kayu, menatap ke atas dengan mata besar yang menggemaskan. Kucing tersebut memiliki bulu lembut dengan campuran bercak putih dan oranye. Latar belakangnya sedikit kabur, menciptakan suasana dalam ruangan yang hangat dan nyaman.\",\"size\":\"1024x1024\"}"
        }
      },
      {
        "id": "222fb799-aw23-42ad-bb4d-e22a7fe72e02",
        "parent": "7ae971ba-05bd-4cc4-bdc2-9c5cc5a91d19",
        "children": [
          // "ea5d2e2d-cadf-4ffa-a78a-53c85b8b91e8"
        ],
        "message": {
          "id": "222fb799-aw23-42ad-bb4d-e22a7fe72e02",
          "role": "assistant",
          "metadata": {},
          "createdAt": "123",
          "content": "{\"prompt\":\"mantap ini promptnya ketiga.\",\"size\":\"1024x1024\"}"
        }
      },
      // new
      {
        "id": "555fb799-aw23-42ad-bb4d-e22a7fe72e02",
        "parent": "111fb799-aw23-42ad-bb4d-e22a7fe72e02",
        "children": [
          // "ea5d2e2d-cadf-4ffa-a78a-53c85b8b91e8"
        ],
        "message": {
          "id": "555fb799-aw23-42ad-bb4d-e22a7fe72e02",
          "role": "user",
          "metadata": {},
          "createdAt": "123",
          "content": "with mantap makasih"
        }
      },
    ].map((d) => ({
      ...d,
      message: d.message?.role ? {
        ...d.message,
        model: 'openai/gpt-3.5-turbo',
      } : undefined,
    }))
  } as ChatConversationData)
  client.value.conversation.updateBranch()

  // client.value.addMessage({
  //   role: 'user',
  //   content: '1. paling awal nih'
  // })
  // const parentBranch = client.value.addMessage({
  //   role: 'assistant',
  //   content: '2. oke memang paling awal'
  // })
  // client.value.addMessage({
  //   role: 'user',
  //   content: '3. a = 10, b = 20'
  // })
  // client.value.addMessage({
  //   role: 'assistant',
  //   content: '4. baik a dan b sudah diisi'
  // })
  // client.value.addMessage({
  //   role: 'user',
  //   content: '5. berapa nilai a?'
  // })
  // client.value.addMessage({
  //   role: 'assistant',
  //   content: 'nilai a adalah 10'
  // })
  // // start new branch
  // client.value.addMessage({
  //   role: 'user',
  //   content: '5. b nilai b?'
  // }, parentBranch)
  // client.value.addMessage({
  //   role: 'assistant',
  //   content: 'nilai b adalah 20'
  // })
  console.log('tree', client.value.conversation.tree)
}
onMounted(() => {
  initDummyData()
  
  // Initialize textarea height after component is mounted
  nextTick(() => {
    chatAction.handleInputMessageTextChatAdjustHeight(true)
  })
})

// refs
const inputChat = useTemplateRef<HTMLInputElement>('input-chat')
const hiddenDiv = useTemplateRef<HTMLDivElement>('hidden-div')
const chatConversationContainer = useTemplateRef<HTMLDivElement>('chat-conversation-container')
const chatConversationActionContainer = useTemplateRef<HTMLDivElement>('chat-conversation-action-container')

// 
const chatConversationLayout = (() => {
  const showScrollToBottomButton = ref(false)

  const chatConversationActionContainerHeight = ref(0)
  const chatConversationContainerHeight = ref(0)

  onComponentLive(() => {
    let interval = setInterval(() => {
      if (chatConversationActionContainer.value) {
        chatConversationActionContainerHeight.value = chatConversationActionContainer.value.clientHeight
        chatAction.handleInputMessageTextChatAdjustHeight(true)
      }
      if (chatConversationContainer.value) {
        // client height
        chatConversationContainerHeight.value = chatConversationContainer.value.clientHeight
        // button for scroll to bottom, if scroll top is in end of div (treshold offset 100px)
        showScrollToBottomButton.value = chatConversationContainer.value.scrollTop < (chatConversationContainer.value.scrollHeight - chatConversationContainer.value.clientHeight - 50)
      }
    }, 100)
    return () => clearInterval(interval)
  })

  const scrollToBottom = (animate: boolean = false) => {
    console.log('scroll to bottom', chatConversationContainer.value)
    // throw new Error('Function not implemented.')
    if (chatConversationContainer.value) {
      chatConversationContainer.value.scrollTop = chatConversationContainer.value.scrollHeight
      // chatConversationContainer.value.animate({
      //   scrollTop: chatConversationContainer.value.scrollHeight,
      // }, {
      //   duration: animate ? 300 : 10,
      //   easing: 'ease-in-out',
      // })
    }
  }


  const scrollToNode = (nodeId: string) => {
    console.log('scroll to node', nodeId)
    const node = nodes.value.find((node) => node.id === nodeId)
    if (!node) return

    // data-layout-name="chat-conversation-node"
    // :data-node-id="node.id"
    const el = document.querySelector(`[data-layout-name="chat-conversation-node"][data-node-id="${nodeId}"]`)
    console.log('el', el)
    if (el) {
      const container = chatConversationContainer.value
      if (container) {
        const offsetAnother = chatConversationActionContainerHeight.value
        const offsetTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop - offsetAnother
        container.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        })
        console.log('scroll to node', nodeId, offsetTop, container.scrollTop, offsetAnother)
      }
    }
  }

  return {
    scrollToBottom,
    scrollToNode,
    showScrollToBottomButton,
    chatConversationActionContainerHeight,
    chatConversationContainerHeight,
  }
})()

// 
const chatAction = (() => {
  const inputMessage = ref('')
  const isWaitingResponse = ref(false)

  // Watch for changes to input message to adjust height
  watch(() => inputMessage.value, () => {
    handleInputMessageTextChatAdjustHeight()
  })

  const handleInputMessageTextChatKeydown = (e: KeyboardEvent) => {
    // handle shift + enter to new line
    if (e.key === 'Enter' && e.shiftKey) {
      return
    }
    if (e.key === 'Enter') {
      console.log('submit chat', inputMessage.value)
      // chat.submitChat()
      return e.preventDefault()
    }
  } 
  const handleInputMessageTextChatAdjustHeight = (forceReset = false) => {
    const perLineHeight = 20;
    if (!inputChat.value || !hiddenDiv.value) return;

    if (forceReset) {
      // Set minimum height instead of resetting to zero
      inputChat.value.style.height = `${perLineHeight}px`;
      inputChat.value.style.overflow = 'hidden';
      
      // After forcing reset, immediately calculate actual height needed
      nextTick(() => {
        handleInputMessageTextChatAdjustHeight(false)
      })
      return;
    }

    // Set hiddenDiv content to the same text as the textarea
    // Add a single character to ensure there's always some content for height calculation
    hiddenDiv.value.textContent = inputChat.value.value || ' ';
    if (!inputChat.value.value.endsWith('\n')) {
      hiddenDiv.value.textContent += '\n'; // Add '\n' to mimic extra new line
    }

    // Copy the style properties from the textarea to hiddenDiv
    const computedStyle = window.getComputedStyle(inputChat.value);
    hiddenDiv.value.style.width = computedStyle.width;
    hiddenDiv.value.style.fontSize = computedStyle.fontSize;
    hiddenDiv.value.style.fontFamily = computedStyle.fontFamily;
    hiddenDiv.value.style.lineHeight = computedStyle.lineHeight;
    hiddenDiv.value.style.padding = computedStyle.padding;
    hiddenDiv.value.style.boxSizing = 'border-box';
    hiddenDiv.value.style.borderWidth = computedStyle.borderWidth;

    // Get the height of the hidden div and set the height of the textarea
    const hiddenDivHeight = Math.max(hiddenDiv.value.scrollHeight, perLineHeight);
    const maxRows = 9;
    const maxHeight = perLineHeight * maxRows;

    if (hiddenDivHeight >= maxHeight) {
      inputChat.value.style.height = `${maxHeight}px`;
      inputChat.value.style.overflow = 'auto';
    } else {
      inputChat.value.style.height = `${hiddenDivHeight}px`;
      inputChat.value.style.overflow = 'hidden';
    }
  }
  const handleInputMessageTextChatInput = () => {
    handleInputMessageTextChatAdjustHeight()
  }
  const focusInputMessageText = () => {
    if (inputChat.value) {
      inputChat.value.focus()
    }
  }

  return {
    inputMessage,
    isWaitingResponse,

    handleInputMessageTextChatKeydown,
    handleInputMessageTextChatInput,
    handleInputMessageTextChatAdjustHeight,
    focusInputMessageText,
  }
})()

export type ChatConversationLayout = typeof chatConversationLayout

provide('client', client)
provide('chatConversationLayout', chatConversationLayout)
</script>

<template>
  <div
    v-if="loaded && client"
    class="flex-1 flex w-full overflow-hidden"
  >
    <!-- main layout -->
    <div class="flex-1 flex flex-col relative">
      <!-- header -->
      <div class="border-b-2 border-neutral-500/30">
        <div class="px-4 py-2 flex items-center justify-between">
          <div class="w-1/4 flex items-center gap-2">
            <UButton
              icon="ph:sidebar-duotone" 
              variant="ghost" 
              :color="$appLayout.sidebarVisible.value ? 'primary' : 'neutral'" 
              @click="$appLayout.toggleSidebar"
            />
            <UButton
              :icon="$appLayout.chatConversationExpandedContainer.value ? `ph:arrows-in-line-horizontal` : `ph:arrows-left-right-duotone`" 
              variant="ghost" 
              color="neutral"
              @click="$appLayout.toggleChatConversationExpandedContainer"
            />
          </div>
          <div class="flex-1 flex items-center justify-center">
            <div>{{ client?.conversation?.data?.title || 'New Chat' }}</div>
          </div>
          <div class="w-1/4 flex items-center justify-end gap-2">
            <UDropdownMenu
              :items="[
                {
                  label: 'Settings',
                }
              ]"
              :ui="{
                content: 'w-48'
              }"
            >
              <UButton 
                icon="ph:dots-three-outline-vertical"
                variant="ghost" 
                color="neutral"
              />
            </UDropdownMenu>
          </div>
        </div>
      </div>
      <!-- chats -->
      <div
        ref="chat-conversation-container"
        class="flex-1 relative flex flex-col overflow-y-auto"
        :style="{
          'paddingBottom': chatConversationActionContainer?.clientHeight + 'px'
        }"
      >
        <div
          class="w-full container mx-auto flex flex-col"
          :class="{
            'max-w-3xl': !$appLayout.chatConversationExpandedContainer.value,
          }"
        >
          <ChatNode
            v-for="node in nodes"
            :key="node.id"
            :conversation="client.conversation"
            :nodes="nodes"
            :node="node"
          >
          </ChatNode>
        </div>
      </div>
      <!-- jump to bot -->
      <div
        v-if="chatConversationLayout.showScrollToBottomButton.value"
        class="fixed bottom-0 p-2 inline-flex left-[50%] translate-x-[-50%] z-10"
        :style="{
          'bottom': `${chatConversationLayout.chatConversationActionContainerHeight.value + 4}px`,
        }"
      >
        <UButton
          class="animate-bounce cursor-pointer"
          icon="ph:arrow-down-duotone"
          :variant="`solid`"
          color="neutral"
          @click="() => chatConversationLayout.scrollToBottom(true)"
        />
      </div>
      <!-- chat conversation action -->
      <div ref="chat-conversation-action-container" class="absolute bottom-0 left-0 w-full flex flex-col">
        <div
          class=" flex-1 mb-4 min-h-[100px] w-full container mx-auto rounded border border-neutral-500/30 bg-neutral-900/30 backdrop-blur  relative overflow-hidden flex flex-col"
          :class="{
            'max-w-3xl': !$appLayout.chatConversationExpandedContainer.value,
          }"
        >
          <div
            class="flex-1 relative flex items-center"
            @click="chatAction.focusInputMessageText"
          >
            <textarea
              ref="input-chat"
              id="chatbox-action-input-textarea"
              placeholder="Type a message..."
              class="flex-1 resize-none bg-transparent text-gray-800 dark:text-gray-100 outline-none overflow-hiddens px-4 py-2"
              v-model="chatAction.inputMessage.value"
              :disabled="chatAction.isWaitingResponse.value"
              @keydown="chatAction.handleInputMessageTextChatKeydown"
              @input="chatAction.handleInputMessageTextChatInput"
            ></textarea>
            <div ref="hidden-div" class="absolute top-0 left-0 invisible whitespace-pre-wrap break-words overflow-hidden w-full px-4 py-2"></div>
          </div>
          <div class="bg-neutral-900 px-2 py-2 flex items-center gap-2">
            <UDropdownMenu
              :items="[]"
              :ui="{
                content: 'w-48'
              }"
            >
              <UButton
                icon="ph:paperclip"
                color="neutral"
                variant="outline"
              />
            </UDropdownMenu>
            <UButton
              icon="ph:globe"
              color="neutral"
              variant="outline"
              label="Web Search"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- sidebar panel -->
    <div
      v-if="sidePanelShow"
      class="w-[300px] border-l border-neutral-500/30 overflow-y-auto"
    >
      <div class="p-4">
        <h3 class="font-semibold mb-4">Sidebar</h3>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure the hidden div mimics textarea exactly but remains invisible */
#chatbox-action-input-textarea, [ref="hidden-div"] {
  min-height: 20px; /* Same as perLineHeight */
  box-sizing: border-box;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>