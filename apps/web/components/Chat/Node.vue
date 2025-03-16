<script lang="ts" setup>
import type { ChatConversation, ChatNode } from '@nakka/kit'
import type { ChatConversationClientInterface } from '~/services/chat-conversation'
import type { ChatConversationLayout } from './Conversation.vue'

const props = defineProps({
  nodes: {
    type: Object as PropType<ChatNode[]>,
    required: true,
  },
  conversation: {
    type: Object as PropType<ChatConversation>,
    required: true,
  },
  node: {
    type: Object as PropType<ChatNode>,
    required: true,
  },
})

const isLastNode = (node: ChatNode) => {
  return node.id === props.nodes[props.nodes.length - 1].id
}

const client = inject<Ref<ChatConversationClientInterface>>('client')
const chatConversationLayout = inject<ChatConversationLayout>('chatConversationLayout')

const switchBranchLeft = () => {
  const nodeId = client?.value?.conversation.changeBranchFromNode('left', props.node.id)
  if (!nodeId) return
  setTimeout(() => chatConversationLayout?.scrollToNode(nodeId), 500)
}

const switchBranchRight = () => {
  const nodeId = client?.value?.conversation.changeBranchFromNode('right', props.node.id)
  if (!nodeId) return
  setTimeout(() => chatConversationLayout?.scrollToNode(nodeId), 100)
}
</script>

<template>
  <div
    v-if="node.message && client"
    class="py-4 px-2 group/node"
    data-layout-name="chat-conversation-node"
    :data-node-id="node.id"
  >
    <div
      class=""
      :class="{
        'flex justify-end': node.message.role === 'user',
        'flex justify-start': node.message.role === 'assistant',
      }"
    >
    <!-- {{ node.id }} -->
    </div>
    <!-- content -->
    <div
      :class="{
        'flex justify-end': node.message.role === 'user',
        'flex justify-start': node.message.role === 'assistant',
      }"
    >
      <div
        :class="{
          'bg-neutral-900 px-4 py-4 rounded border border-neutral-500/30 w-auto inline-block max-w-[80%]': node.message.role === 'assistant',
          '': node.message.role === 'user',
        }"
      >
        {{ node.message.content }}
      </div>
    </div>
    <!-- footer -->
    <div
      :class="{
        'flex flex-col items-end': node.message.role === 'user',
        'flex flex-col items-start': node.message.role === 'assistant',
      }"
      >
      <!-- <div>
        {{ client.getBranchFromParentNode(node.id).length }} - {{ client.getBranchFromParentNode(node.id).map(n => n) }}
      </div> -->
      <div
        class="flex items-center gap-1 mt-2"
        :class="{
          'flex-row-reverse': node.message.role === 'user',
          'flex-row': node.message.role === 'assistant',
        }"
      >
        <!-- branch switcher -->
        <div
          v-if="client?.conversation.getBranchFromParentNode(node.id).length > 1"
          class="flex items-center gap-0.5"
        >
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:caret-left" @click="switchBranchLeft" />
          <div class="text-xs">
            {{ client?.conversation.getCurrentBranchIndexChildrenFromParentNode(node.id) + 1 }}/{{ client?.conversation.getBranchFromParentNode(node.id).length }}
          </div>
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:caret-right" @click="switchBranchRight" />
        </div>
        <!-- actions -->
        <div
          class="transition-all duration-300 flex items-center gap-0.5"
          :class="{
            'invisible opacity-0 group-hover/node:opacity-100 group-hover/node:visible': !isLastNode(node),
          }"
        >
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:copy-duotone" />
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:star-duotone" />
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:thumbs-up-duotone" />
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:thumbs-down-duotone" />
          <UButton variant="ghost" color="neutral" size="xs" icon="ph:arrow-counter-clockwise-duotone" />
        </div>
      </div>
    </div>
  </div>
</template>