<script setup lang="ts">
import type { Message } from '~/types'
import { useChatStore } from '~/stores/chat'

defineProps<{
  message?: Message
}>()

const emit = defineEmits<{
  close: []
}>()

const chatStore = useChatStore()
const branchName = ref('')
const showBranchDialog = ref(false)
const selectedMessage = ref<Message | null>(null)

async function handleCreateBranch(message: Message) {
  selectedMessage.value = message
  showBranchDialog.value = true
}

async function confirmCreateBranch() {
  if (!selectedMessage.value || !branchName.value)
    return

  await chatStore.createBranch(
    selectedMessage.value.id,
    branchName.value,
  )

  showBranchDialog.value = false
  branchName.value = ''
  selectedMessage.value = null
}
</script>

<template>
  <div class="fixed right-0 top-0 h-full w-[800px] bg-white p-4 shadow-lg dark:bg-neutral-800">
    <div class="mb-4 flex items-center justify-between">
      <h3 class="text-lg font-semibold">
        Conversation Flow
      </h3>
      <button
        class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        @click="emit('close')"
      >
        <div i-carbon-close text-xl />
      </button>
    </div>

    <div class="h-[calc(100%-4rem)]">
      <BranchFlow @branch="handleCreateBranch" />
    </div>

    <!-- 创建分支对话框 -->
    <div
      v-if="showBranchDialog"
      class="fixed inset-0 flex items-center justify-center bg-black/50"
    >
      <div class="w-96 rounded-lg bg-white p-4 dark:bg-neutral-800">
        <h4 class="mb-4 text-lg font-semibold">
          Create New Branch
        </h4>
        <input
          v-model="branchName"
          type="text"
          class="mb-4 w-full border rounded px-3 py-2 dark:border-neutral-600 dark:bg-neutral-700"
          placeholder="Branch name"
        >
        <div class="flex justify-end gap-2">
          <button
            class="px-4 py-2 text-gray-600 dark:text-gray-400"
            @click="showBranchDialog = false"
          >
            Cancel
          </button>
          <button
            class="rounded bg-blue-500 px-4 py-2 text-white"
            @click="confirmCreateBranch"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
