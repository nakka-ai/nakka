<script lang="ts" setup>
export interface ChatItem {
  type: 'item' | 'folder'
  id: string
  name: string
  icon: string
  children?: ChatItem[]
}

const props = defineProps({
  items: Array as PropType<ChatItem[]>,
  child: Boolean as PropType<boolean>,
  level: Number as PropType<number>,
  parent: Object as PropType<ChatItem|undefined>,
})

// define emits on items update with types
const emit = defineEmits<{
  (e: 'move-item', itemId: string, destinationFolderId?: string): void
}>()

const findItem = (items: ChatItem[], itemId: string): ChatItem|undefined => {
  for (const item of items) {
    if (item.id === itemId) {
      return item
    }
    if (item.children) {
      const found = findItem(item.children, itemId)
      if (found) {
        return found
      }
    }
  }
}

const findParentFolder = (items: ChatItem[], itemId: string): ChatItem|undefined => {
  for (const item of items) {
    if (item.children) {
      const found = findItem(item.children, itemId)
      if (found) {
        return item
      }
    }
  }
}

const handleDragStart = (e: DragEvent, itemId: string) => {
  // items is array nested, can be folder or items
  // if itemId is folder, folderId is itemId, but if itemId is item, we need to find the parent folder
  // but if item in root, folderId can be set to undefined
  let folderId: undefined|string
  const items = props.items || []
  // find itemId in items, and aware because it can be nested
  const item = findItem(items, itemId)

  if (item) {
    if (item.type === 'folder') {
      folderId = item.id
    } else {
      const parentFolder = findParentFolder(items, itemId)
      if (parentFolder) {
        folderId = parentFolder.id
      }
    }

    e.dataTransfer?.setData('application/json', JSON.stringify({ itemId, folderId  }))
    console.log('drag start', {
      itemId,
      folderId,
    })
  }
}

const handleDrop = (e: DragEvent, dropInItem: string) => {
  e.preventDefault()
  try {
    const data = JSON.parse(e.dataTransfer?.getData('application/json') || '{}')
    const items = props.items || []
    const destItem = findItem(items, dropInItem)
    let destFolderId: undefined|string
    if (!destItem) return

    if (destItem.type === 'folder') {
      destFolderId = destItem.id
    } else {
      const parentFolder = findParentFolder(items, dropInItem)
      if (parentFolder) {
        destFolderId = parentFolder.id
      } else {
        destFolderId = props.parent?.id
      }
    }

    if (destFolderId && data.itemId != dropInItem && data.folderId != destFolderId) {
      emit('move-item', data.itemId, destFolderId)
    }

    console.log('drag drop', {
      itemId: data.itemId,
      folderId: data.folderId,
      destFolderId,
      destItemId: dropInItem,
      level: props.level,
      data,
    })
  } catch (error) {}
  // if (oldIndex !== newIndex && oldIndex >= 0) {
  //   const updated = [...props.items || []]
  //   const [moved] = updated.splice(oldIndex, 1)
  //   updated.splice(newIndex, 0, moved)
  //   updateItems(updated.filter(Boolean))
  // }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
}
</script>

<template>
  <div
    v-for="item in items"
    :key="item.id"
  >
    <div
      class="px-4 py-1 flex items-center gap-2 hover:bg-neutral-800/80 cursor-pointer relative"
      draggable="true"
      @dragstart="handleDragStart($event, item.id)"
      @drop="handleDrop($event, item.id)"
      @dragover="handleDragOver($event)"
    >
      <div v-if="child" class="absolute left-0 w-2.5 h-0.5 bg-neutral-500/30" />
      <div class="relative flex flex-row items-center gap-1">
        <UIcon v-if="item.type == 'folder'" name="ph:folder" class="text-neutral-500 dark:text-neutral-400" />
        <UIcon :name="item.icon" class="left-1.5 top-1.5 text-sm text-neutral-500 dark:text-neutral-400" />
      </div>
      <div class="text-md">{{ item.name }}</div>
    </div>
    <div v-if="item.children && item.children.length > 0" class="pl-6 relative">
      <div class="absolute h-[calc(100%-13px)] w-0.5 block bg-neutral-500/30" />
      <ChatMenu
        :items="item.children"
        :parent="item"
        :level="(level || 0) + 1"
        child
        @move-item="(...args) => emit('move-item', ...args)"
      />
    </div>
  </div>
</template>