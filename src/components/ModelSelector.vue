<script setup lang="ts">
import type { ModelOption } from '~/types/model'
import { useChatStore } from '~/stores/chat'
import { AVAILABLE_MODELS } from '~/types/model'

const props = defineProps<{
  modelId?: string
}>()

const emit = defineEmits<{
  'update:modelId': [value: string]
  'change': [model: ModelOption]
}>()

const chatStore = useChatStore()
const showSelector = ref(false)

const currentModel = computed(() => {
  return AVAILABLE_MODELS.find(m => m.id === props.modelId)
    ?? AVAILABLE_MODELS[1] // 默认使用 gpt-3.5-turbo
})

async function selectModel(model: ModelOption) {
  if (!chatStore.currentThread)
    return

  // 更新线程的模型设置
  await chatStore.updateThreadModel(model.id, model.defaultParams)
  emit('update:modelId', model.id)
  emit('change', model)
  showSelector.value = false
}
</script>

<template>
  <div class="relative">
    <button
      class="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
      @click="showSelector = !showSelector"
    >
      <span>{{ currentModel.name }}</span>
      <div i-carbon-caret-down />
    </button>

    <div
      v-if="showSelector"
      class="absolute left-0 top-full z-10 mt-1 w-64 border rounded-lg bg-white p-2 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div class="space-y-1">
        <button
          v-for="model in AVAILABLE_MODELS"
          :key="model.id"
          class="w-full flex flex-col gap-1 rounded-md px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-700"
          :class="{ 'bg-blue-50 dark:bg-blue-900/20': model.id === currentModel.id }"
          @click="selectModel(model)"
        >
          <span class="font-medium">{{ model.name }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ model.description }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
