<script setup lang="ts">
import type { Message } from '~/types'
import { db } from '~/modules/database'
import { useChatStore } from '~/stores/chat'

const chatStore = useChatStore()
const selectedMessage = ref<Message | null>(null)
const showBranchView = ref(false)

onMounted(async () => {
  // 加载最近的对话
  const threads = await db.getAllThreads()
  if (threads.length > 0) {
    // 按更新时间排序，获取最近的对话
    const latestThread = threads.sort((a, b) => b.updatedAt - a.updatedAt)[0]
    await chatStore.switchThread(latestThread)
  }
})

function handleBranch(message: Message) {
  selectedMessage.value = message
}

function toggleBranchView() {
  showBranchView.value = !showBranchView.value
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <TheHeader />
    <div class="relative flex flex-1">
      <div class="flex-1">
        <div class="absolute right-4 top-4 z-10">
          <button
            class="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700"
            @click="toggleBranchView"
          >
            <div i-carbon-flow text-lg />
            <span>View Branches</span>
          </button>
        </div>
        <ChatThread @branch="handleBranch" />
      </div>
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition-transform duration-300 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="translate-x-full"
      >
        <BranchView
          v-if="showBranchView || selectedMessage"
          :message="selectedMessage || undefined"
          @close="showBranchView = false; selectedMessage = null"
        />
      </Transition>
    </div>
  </div>
</template>
