<script setup lang="ts">
import type { Thread } from '~/types'
import { db } from '~/modules/database'
import { useChatStore } from '~/stores/chat'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const chatStore = useChatStore()
const threads = ref<Thread[]>([])
const searchQuery = ref('')
const editingThreadId = ref<string | null>(null)
const editingTitle = ref('')

// 加载历史记录
async function loadHistory() {
  if (searchQuery.value)
    threads.value = await db.searchThreads(searchQuery.value)
  else
    threads.value = await db.getAllThreads()
}

// 切换到指定对话
async function switchThread(thread: Thread) {
  await chatStore.switchThread(thread)
  emit('close')
}

// 删除对话
async function deleteThread(thread: Thread) {
  await chatStore.deleteThread(thread.id)
  await loadHistory()
}

// 开始编辑标题
function startEditing(thread: Thread) {
  editingThreadId.value = thread.id
  editingTitle.value = thread.title
}

// 保存标题
async function saveTitle(thread: Thread) {
  if (!editingTitle.value.trim())
    return

  const updatedThread = {
    ...thread,
    title: editingTitle.value.trim(),
    updatedAt: Date.now(),
  }

  await chatStore.updateThread(updatedThread)
  editingThreadId.value = null
  await loadHistory()
}

// 取消编辑
function cancelEditing() {
  editingThreadId.value = null
}

// 监听搜索
watch(searchQuery, () => {
  loadHistory()
})

// 初始加载
onMounted(() => {
  loadHistory()
})
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform -translate-x-full opacity-0"
    enter-to-class="transform translate-x-0 opacity-100"
    leave-active-class="transition duration-300 ease-in"
    leave-from-class="transform translate-x-0 opacity-100"
    leave-to-class="transform -translate-x-full opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50 flex"
    >
      <div class="w-80 bg-white p-4 shadow-lg dark:bg-neutral-800">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Chat History
          </h3>
          <button
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            @click="emit('close')"
          >
            <div i-carbon-close text-xl />
          </button>
        </div>

        <input
          v-model="searchQuery"
          type="text"
          class="mb-4 w-full border rounded-lg px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          placeholder="Search chats..."
        >

        <div class="space-y-2">
          <div
            v-for="thread in threads"
            :key="thread.id"
            class="group rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-neutral-700"
            :class="{ 'bg-blue-50 dark:bg-blue-900/20': thread.id === chatStore.activeThreadId }"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div v-if="editingThreadId === thread.id" class="flex items-center gap-2">
                  <input
                    v-model="editingTitle"
                    type="text"
                    class="flex-1 border rounded px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-700"
                    @keyup.enter="saveTitle(thread)"
                    @keyup.esc="cancelEditing"
                  >
                  <button
                    class="text-green-500 hover:text-green-600"
                    @click="saveTitle(thread)"
                  >
                    <div i-carbon-checkmark />
                  </button>
                  <button
                    class="text-gray-500 hover:text-gray-600"
                    @click="cancelEditing"
                  >
                    <div i-carbon-close />
                  </button>
                </div>
                <div v-else>
                  <button
                    class="flex-1 text-left font-medium"
                    @click="switchThread(thread)"
                  >
                    {{ thread.title }}
                  </button>
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400">
                  {{ new Date(thread.updatedAt).toLocaleString() }}
                </div>
              </div>
              <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  @click="startEditing(thread)"
                >
                  <div i-carbon-edit text-sm />
                </button>
                <button
                  class="text-red-500 hover:text-red-600"
                  @click="deleteThread(thread)"
                >
                  <div i-carbon-trash-can text-sm />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex-1 bg-black/20"
        @click="emit('close')"
      />
    </div>
  </Transition>
</template>
