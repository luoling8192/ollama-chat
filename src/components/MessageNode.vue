<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'

interface Props {
  data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    messageId: string
    onBranch?: (messageId: string) => void
  }
}

const props = defineProps<Props>()

function handleBranch() {
  props.data.onBranch?.(props.data.messageId)
}
</script>

<template>
  <div
    class="relative border border-gray-700 rounded-lg bg-gray-800 p-4 text-white"
    :class="{
      'border-blue-500': data.role === 'user',
      'border-green-500': data.role === 'assistant',
      'border-yellow-500': data.role === 'system',
    }"
  >
    <Handle
      type="source"
      :position="Position.Left"
    />
    <div class="absolute right-2 -top-3">
      <button
        v-if="data.role !== 'system'"
        class="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
        @click="handleBranch"
      >
        Branch
      </button>
    </div>
    <div class="text-sm">
      {{ data.role }}
    </div>
    <div class="mt-2 whitespace-pre-wrap">
      {{ data.content }}
    </div>
    <Handle
      type="source"
      :position="Position.Right"
    />
  </div>
</template>

<style scoped>
.vue-flow__handle {
  background: #555;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.vue-flow__handle:hover {
  background: #777;
}

:deep(.vue-flow__edge-path) {
  stroke: #555;
  stroke-width: 2;
  fill: none;
}

:deep(.vue-flow__edge) {
  path {
    stroke-dasharray: none;
  }
}
</style>
