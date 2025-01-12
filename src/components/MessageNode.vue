<script setup lang="ts">
import type { MessageNodeData } from './ChatFlow.vue'
import { Handle } from '@vue-flow/core'

defineProps<{
  data: MessageNodeData
}>()
</script>

<template>
  <div
    class="message-node" :class="[
      `message-node--${data.role}`,
    ]"
  >
    <Handle
      type="target"
      position="left"
    />
    <div class="message-content">
      <div class="message-role">
        {{ data.role }}
      </div>
      <div class="message-text">
        {{ data.content }}
      </div>
    </div>
    <Handle
      type="source"
      position="right"
    />
  </div>
</template>

<style scoped>
.message-node {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #ffffff;
  background: #2a2a2a;
  min-width: 150px;
}

.message-role {
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.message-text {
  color: #fff;
  font-size: 14px;
}

.message-node--user {
  border-color: #4caf50;
}

.message-node--assistant {
  border-color: #2196f3;
}
</style>
