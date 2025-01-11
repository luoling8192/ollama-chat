<script setup lang="ts">
import type { Message } from '~/types'
import { useChatStore } from '~/stores/chat'

const emit = defineEmits<{
  branch: [message: Message]
}>()
const chatStore = useChatStore()
const messageInput = ref('')
const messageContainer = ref<HTMLElement>()

// 过滤当前线程和分支的消息
const messages = computed(() => {
  if (!chatStore.activeThreadId)
    return []

  return Object.values(chatStore.messages)
    .filter(m =>
      m.threadId === chatStore.activeThreadId
      && m.branchId === (chatStore.activeBranchId || 'main'),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
})

async function sendMessage() {
  if (!messageInput.value.trim())
    return

  await chatStore.sendMessage(messageInput.value)
  messageInput.value = ''
}

function handleBranch(message: Message) {
  emit('branch', message)
}

// 监听消息变化，自动滚动到最新消息
watch(messages, async (newMessages) => {
  if (newMessages.length > 0) {
    await nextTick()
    if (messageContainer.value)
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
  }
}, { deep: true })
</script>

<template>
  <div class="h-full flex flex-col">
    <div
      ref="messageContainer"
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      <template v-for="message in messages" :key="message.id">
        <div
          :id="`message-${message.id}`"
          class="group flex items-start gap-3"
          :class="[
            message.role === 'assistant'
              ? 'bg-gray-50 dark:bg-neutral-900 p-4 rounded-lg'
              : '',
          ]"
        >
          <div
            class="h-8 w-8 flex items-center justify-center rounded-full"
            :class="[
              message.role === 'assistant'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-neutral-700',
            ]"
          >
            {{ message.role === 'assistant' ? 'A' : 'U' }}
          </div>
          <div class="flex-1 space-y-2">
            <div class="max-w-none prose dark:prose-invert">
              {{ message.content.value }}
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{{ new Date(message.timestamp).toLocaleTimeString() }}</span>
              <button
                class="opacity-0 transition-opacity group-hover:opacity-100"
                @click="handleBranch(message)"
              >
                <div i-carbon-fork text-sm />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="border-t p-4 dark:border-neutral-800">
      <div class="flex gap-2">
        <input
          v-model="messageInput"
          type="text"
          class="flex-1 border rounded-lg px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
          placeholder="Type a message..."
          @keyup.enter="sendMessage"
        >
        <button
          class="rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          :disabled="chatStore.isLoading"
          @click="sendMessage"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>
