<script setup lang="ts">
import type { Message } from '~/types'
import { db } from '~/modules/database'
import { useChatStore } from '~/stores/chat'

const chatStore = useChatStore()
const isDrawerOpen = ref(false)

onMounted(async () => {
  const threads = await db.getAllThreads()
  if (threads.length > 0) {
    const latestThread = threads.sort((a, b) => b.updatedAt - a.updatedAt)[0]
    await chatStore.switchThread(latestThread)
  }
})

function toggleDrawer() {
  isDrawerOpen.value = !isDrawerOpen.value
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <TheHeader />
    <div class="relative flex flex-1">
      <div class="flex-1">
        <ChatThread @branch="(message: Message) => chatStore.handleBranch(message.id)" />
      </div>
      <button
        class="fixed right-4 top-18 rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        @click="toggleDrawer"
      >
        Chat View
      </button>

      <div
        class="fixed inset-y-0 right-0 z-[999] w-4/5 transform bg-gray-800 transition-transform duration-300"
        :class="{ 'translate-x-0': isDrawerOpen, 'translate-x-full': !isDrawerOpen }"
      >
        <div class="h-full p-4">
          <ChatFlow
            :messages="chatStore.currentMessages"
            :branches="chatStore.currentBranches"
            @close="toggleDrawer"
            @branch="chatStore.handleBranch"
          />
        </div>
      </div>
    </div>
  </div>
</template>
