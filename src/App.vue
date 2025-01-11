<script setup lang="ts">
import type { Message } from '~/types'
import { db } from '~/modules/database'
import { useChatStore } from '~/stores/chat'

const chatStore = useChatStore()
const selectedMessage = ref<Message | null>(null)

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
</script>

<template>
  <div class="h-screen flex flex-col">
    <TheHeader />
    <div class="relative flex flex-1">
      <div class="flex-1">
        <ChatThread @branch="handleBranch" />
      </div>
    </div>
  </div>
</template>
