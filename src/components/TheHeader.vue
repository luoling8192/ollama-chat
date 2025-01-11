<script setup lang="ts">
import { toggleDark } from '~/composables/dark'
import { useChatStore } from '~/stores/chat'
import { useSettingsStore } from '~/stores/settings'

const showSettings = ref(false)
const showHistory = ref(false)
const settingsStore = useSettingsStore()
const chatStore = useChatStore()

const userName = computed(() => settingsStore.userName || 'Guest')
const currentModelId = computed(() => chatStore.currentThread?.metadata.model)

async function createNewChat() {
  await chatStore.createThread('New Chat')
}
</script>

<template>
  <header class="h-14 flex items-center justify-between border-b px-4 dark:border-neutral-800">
    <div class="flex items-center space-x-4">
      <h1 class="text-lg font-medium">
        Chat Bot
      </h1>
      <button
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        @click="showHistory = true"
      >
        <div i-carbon-list text-xl />
      </button>
      <button
        class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        @click="createNewChat"
      >
        <div i-carbon-add text-xl />
      </button>
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Welcome, {{ userName }}
      </span>
    </div>

    <div class="flex items-center space-x-4">
      <ModelSelector
        v-if="currentModelId"
        v-model:model-id="currentModelId"
      />
      <div class="flex items-center space-x-2">
        <button
          class="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
          @click="toggleDark()"
        >
          <div i-carbon-moon dark:i-carbon-sun text-xl />
        </button>
        <button
          class="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 hover:text-gray-700 dark:hover:bg-neutral-800 dark:hover:text-gray-200"
          @click="showSettings = true"
        >
          <div i-carbon-settings text-xl />
        </button>
      </div>
    </div>

    <SettingsDialog
      :show="showSettings"
      @close="showSettings = false"
    />
    <ChatHistory
      :show="showHistory"
      @close="showHistory = false"
    />
  </header>
</template>
