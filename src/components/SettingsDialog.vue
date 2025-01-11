<script setup lang="ts">
import { useSettingsStore } from '~/stores/settings'

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const settingsStore = useSettingsStore()

const formData = reactive({
  apiKey: settingsStore.apiKey,
  baseUrl: settingsStore.baseUrl,
  userName: settingsStore.userName,
})

async function handleSave() {
  await settingsStore.updateSettings(formData)
  emit('close')
}

function handleCancel() {
  Object.assign(formData, {
    apiKey: settingsStore.apiKey,
    baseUrl: settingsStore.baseUrl,
    userName: settingsStore.userName,
  })
  emit('close')
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-1 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-1 opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-50"
    >
      <div
        class="fixed inset-0 bg-black/20 dark:bg-black/40"
        @click="emit('close')"
      />
      <div class="fixed inset-x-4 top-8 z-50 mx-auto max-w-xl rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-800">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-medium">
            Settings
          </h2>
          <button
            class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            @click="emit('close')"
          >
            <div i-carbon-close text-xl />
          </button>
        </div>

        <div class="mt-6 space-y-6">
          <div class="space-y-2">
            <label
              for="userName"
              class="block text-sm text-gray-700 font-medium dark:text-gray-200"
            >
              User Name
            </label>
            <input
              id="userName"
              v-model="formData.userName"
              type="text"
              class="block w-full border border-gray-300 rounded-md px-3 py-2 dark:border-gray-600 dark:bg-neutral-700"
              placeholder="Enter your name"
            >
          </div>

          <div class="space-y-2">
            <label
              for="apiKey"
              class="block text-sm text-gray-700 font-medium dark:text-gray-200"
            >
              API Key
            </label>
            <input
              id="apiKey"
              v-model="formData.apiKey"
              type="password"
              class="block w-full border border-gray-300 rounded-md px-3 py-2 dark:border-gray-600 dark:bg-neutral-700"
              placeholder="Enter your API key"
            >
          </div>

          <div class="space-y-2">
            <label
              for="baseUrl"
              class="block text-sm text-gray-700 font-medium dark:text-gray-200"
            >
              Base URL
            </label>
            <input
              id="baseUrl"
              v-model="formData.baseUrl"
              type="text"
              class="block w-full border border-gray-300 rounded-md px-3 py-2 dark:border-gray-600 dark:bg-neutral-700"
              placeholder="Enter API base URL"
            >
          </div>
        </div>

        <div class="mt-6 flex justify-end space-x-4">
          <button
            class="rounded-md px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            @click="handleCancel"
          >
            Cancel
          </button>
          <button
            class="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            @click="handleSave"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
