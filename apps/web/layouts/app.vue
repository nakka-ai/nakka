<script lang="ts" setup>
import type { DropdownMenuItem } from '#ui/types'
import type { ChatItem } from '~/components/Chat/Menu.vue'

const route = useRoute()
const $appLayout = useAppLayout()

const menus = computed(() => {
  const _menus = [
    {
      label: 'Dashboard',
      icon: 'ph:house-duotone',
      to: '/',
    },
    {
      label: 'Workspace',
      icon: 'ph:hammer-duotone',
      to: '/workspace',
    },
    {
      label: 'Activity',
      icon: 'ph:align-bottom-duotone',
      to: '/activity',
    },
    {
      label: 'Community',
      icon: 'ph:users-duotone',
      to: '/community',
    },
  ]
  return _menus.map((menu) => {
    return {
      ...menu,
      active: route.path === menu.to,
    }
  })
})

const avatarDropdownItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Profile',
      icon: 'ph:user-circle-duotone',
    },
    {
      label: 'Logout',
      icon: 'ph:sign-out-duotone',
    }
  ]
])

const chatItems = reactive<ChatItem[]>([
  { type: 'folder', id: 'folder-1', name: 'Favorites', icon: 'twemoji:star', children: [] },
  {
    type: 'folder',
    id: 'folder-2',
    name: 'Educations',
    icon: 'twemoji:books',
    children: [
      {
        type: 'item',
        id: 'item-1',
        name: 'Mathematics',
        icon: 'twemoji:input-symbols',
      },
      {
        type: 'item',
        id: 'item-2',
        name: 'Thesis',
        icon: 'twemoji:blue-book',
      },
      {
        type: 'folder',
        id: 'folder-4',
        name: 'Others',
        icon: 'twemoji:books',
        children: [
          {
            type: 'item',
            id: 'item-3',
            name: 'Art',
            icon: 'twemoji:input-symbols',
          },
          {
            type: 'item',
            id: 'item-4',
            name: 'Literature',
            icon: 'twemoji:blue-book',
          }
        ]
      },
    ]
  },
  { type: 'folder', id: 'folder-3', name: 'General', icon: 'twemoji:globe-with-meridians', children: [] },
])
const chatItemMove = (itemId: string, destFolderId: string | undefined) => {
  console.log("move-item", { itemId, destFolderId });

  // Mencari item berdasarkan id (rekursif)
  const findItem = (items: ChatItem[], itemId: string): ChatItem | undefined => {
    for (const item of items) {
      if (item.id === itemId) return item;
      if (item.children) {
        const found = findItem(item.children, itemId);
        if (found) return found;
      }
    }
  };

  // Mencari parent dari item berdasarkan id (rekursif)
  const findParentFolder = (items: ChatItem[], itemId: string): ChatItem | undefined => {
    for (const item of items) {
      if (item.children?.some(child => child.id === itemId)) {
        return item;
      }
      if (item.children) {
        const found = findParentFolder(item.children, itemId);
        if (found) return found;
      }
    }
  };

  // Mencari item yang akan dipindahkan
  const item = findItem(chatItems, itemId);
  if (!item) return; // Jika item tidak ditemukan, hentikan

  // Mencari parent folder dari item
  const parentFolder = findParentFolder(chatItems, itemId);
  if (parentFolder) {
    // Hapus item dari parent folder
    parentFolder.children = parentFolder.children!.filter((i) => i.id !== itemId);
  } else {
    // Jika tidak memiliki parent (berada di root), hapus dari chatItems
    const index = chatItems.findIndex((i) => i.id === itemId);
    if (index !== -1) chatItems.splice(index, 1);
  }

  // Jika tujuan ada, masukkan ke dalamnya
  if (destFolderId) {
    const destFolder = findItem(chatItems, destFolderId);
    if (destFolder && destFolder.type === "folder") {
      destFolder.children = destFolder.children || [];
      destFolder.children.push(item);
    }
  } else {
    // Jika tidak ada folder tujuan, pindahkan ke root
    chatItems.push(item);
  }
};
</script>

<template>
  <div class="flex min-h-screen max-h-screen bg-white dark:bg-black">
    <div class="flex-1 border border-neutral-500/30 m-1 rounded-xl flex bg-neutral-50 overflow-hidden dark:bg-neutral-950">
      <!-- sidebar -->
      <div v-show="$appLayout.sidebarVisible.value" class="w-[240px] border-r border-neutral-500/30 bg-neutral-900 flex flex-col">
        <div class="flex-1 flex flex-col overflow-y-auto relative">
          <div class="flex flex-col gap-1 p-2">
            <UButton
              v-for="menu in menus"
              :key="menu.label"
              :icon="menu.icon"
              :label="menu.label"
              :variant="menu.active ? 'subtle' : 'ghost'"
              :to="menu.to"
              size="md"
              color="neutral"
            />
          </div>
          <div>
            <div class="mt-4">
              <div class="px-4 border-t border-neutral-500/30">
                <div class="-mt-3.5">
                  <span class="inline-block text-sm font-semibold bg-neutral-800 border border-neutral-500/30 rounded px-2 py-1">Chats</span>
                </div>
              </div>
              <div class="pb-1 pt-2 flex flex-col">
                <div class="px-4 flex">
                  <UInput size="md" class="flex-1" placeholder="Search chat" />
                </div>
                <ChatMenu
                  :items="chatItems"
                  :level="0"
                  @move-item="chatItemMove"
                />
              </div>
              <div class="flex flex-col px-2 mt-2">
                <UButtonGroup class="w-full">
                  <UButton
                    icon="ph:chat"
                    label="New Chat"
                    class="w-full justify-center"
                    to="/chat"
                    size="sm"
                  />
                  <UDropdownMenu
                    :ui="{ content: 'w-48' }"
                    :items="[
                      { label: 'New Folder', icon: 'ph:folder' },
                      { label: 'New Chat', icon: 'ph:chat', to: '/chat' },
                    ]"
                    :content="{ align: 'end', side: 'top' }"
                  >
                    <UButton color="neutral" variant="outline" icon="ph:caret-up" />
                  </UDropdownMenu>
                </UButtonGroup>
              </div>
            </div>
          </div>
        </div>
        <div class="border-t border-neutral-500/30 flex flex-col px-2 pt-2 pb-2">
          <UDropdownMenu
            :items="avatarDropdownItems"
            :ui="{
              content: 'w-48',
            }"
            :content="{
              align: 'end',
              side: 'right',
            }"
            arrow
          >
            <UButton variant="ghost" size="sm">
              <UAvatar src="https://github.com/viandwi24.png" />
              <div class="flex-1 flex flex-col items-start text-left">
                <div class="text-neutral-50">viandwi24</div>
                <div class="text-neutral-500 text-[10px]">viandwi24@pm.me</div>
              </div>
              <div>
                <UIcon name="ph:caret-up-duotone" class="text-neutral-900 dark:text-neutral-100" />
              </div>
            </UButton>
          </UDropdownMenu>
        </div>
      </div>
      <!-- main -->
      <div class="flex flex-col w-full flex-1">
        <slot />
      </div>
    </div>
  </div>
</template>