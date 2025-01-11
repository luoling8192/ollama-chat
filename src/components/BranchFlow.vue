<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import type { Branch, Message } from '~/types'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/minimap'
import { isDark } from '~/composables/dark'
import { useChatStore } from '~/stores/chat'

const emit = defineEmits<{
  branch: [message: Message]
}>()

const chatStore = useChatStore()

interface MessageNode extends Node {
  data: {
    label: string
    message: Message
  }
}

interface BranchNode extends Node {
  data: {
    label: string
    branch: Branch
  }
}

type FlowNode = MessageNode | BranchNode

const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useVueFlow<FlowNode>()

// 将分支树转换为 Vue Flow 节点
function createNodes(messages: Message[], branches: Branch[]): Node[] {
  const messageNodes: Node[] = messages.map(msg => ({
    id: msg.id,
    type: 'default',
    position: { x: 0, y: 0 }, // 位置将在后面计算
    data: {
      label: msg.content.value.slice(0, 50) + (msg.content.value.length > 50 ? '...' : ''),
      message: msg,
    },
  }))

  const branchNodes: Node[] = branches.map(branch => ({
    id: branch.id,
    type: 'group',
    position: { x: 0, y: 0 },
    data: {
      label: branch.name,
      branch,
    },
    style: {
      backgroundColor: 'rgba(240, 240, 240, 0.5)',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '10px',
    },
  }))

  return [...messageNodes, ...branchNodes]
}

// 创建边连接
function createEdges(messages: Message[], branches: Branch[]): Edge[] {
  const edges: Edge[] = []

  // 消息之间的连接
  messages.forEach((msg, index) => {
    if (index > 0) {
      edges.push({
        id: `${messages[index - 1].id}-${msg.id}`,
        source: messages[index - 1].id,
        target: msg.id,
        type: 'smoothstep',
      })
    }
  })

  // 分支连接
  branches.forEach((branch) => {
    if (branch.parentMessageId) {
      edges.push({
        id: `${branch.parentMessageId}-${branch.id}`,
        source: branch.parentMessageId,
        target: branch.id,
        type: 'smoothstep',
        style: { stroke: '#6366f1' },
      })
    }
  })

  return edges
}

// 计算节点位置
function layoutNodes(nodes: Node[], branches: Branch[]) {
  const VERTICAL_SPACING = 80
  const HORIZONTAL_SPACING = 200
  let currentY = 0

  // 按分支组织消息
  branches.forEach((branch, branchIndex) => {
    const branchMessages = nodes.filter(
      node => 'message' in node.data && node.data.message.branchId === branch.id,
    )

    // 设置分支节点位置
    const branchNode = nodes.find(node => node.id === branch.id)
    if (branchNode) {
      branchNode.position = {
        x: branchIndex * HORIZONTAL_SPACING,
        y: currentY,
      }
    }

    // 设置消息节点位置
    branchMessages.forEach((node, index) => {
      node.position = {
        x: branchIndex * HORIZONTAL_SPACING + 50,
        y: currentY + (index + 1) * VERTICAL_SPACING,
      }
    })

    currentY += (branchMessages.length + 2) * VERTICAL_SPACING
  })
}

// 监听当前线程变化
watch(
  () => chatStore.currentThread,
  (thread) => {
    if (!thread)
      return

    const allMessages = Object.values(chatStore.messages)
      .filter(msg => msg.threadId === thread.id)
    const newNodes = createNodes(allMessages, thread.branches)
    const newEdges = createEdges(allMessages, thread.branches)

    layoutNodes(newNodes, thread.branches)

    nodes.value = newNodes
    edges.value = newEdges
  },
  { immediate: true },
)

// 处理节点点击
async function onNodeClick(event: any, node: FlowNode) {
  if ('message' in node.data) {
    // 如果是消息节点，显示创建分支对话框
    emit('branch', node.data.message)
  }
  else if ('branch' in node.data) {
    // 如果是分支节点，切换到该分支并滚动到相应消息
    await chatStore.switchBranch(node.data.branch.id)

    // 获取分支的第一条消息
    const branchMessages = Object.values(chatStore.messages)
      .filter(m => m.branchId === node.data.branch.id)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (branchMessages.length > 0) {
      // 使用 nextTick 确保 DOM 已更新
      await nextTick()
      const messageEl = document.getElementById(`message-${branchMessages[0].id}`)
      if (messageEl)
        messageEl.scrollIntoView({ behavior: 'smooth' })
    }
  }
}
</script>

<template>
  <div class="h-full w-full">
    <VueFlow
      v-model="nodes"
      v-model:edges="edges"
      :default-viewport="{ zoom: 1 }"
      :fit-view="true"
      class="bg-gray-50 dark:bg-neutral-900"
      @node-click="onNodeClick"
      @nodes-change="onNodesChange"
      @edges-change="onEdgesChange"
      @connect="onConnect"
    >
      <Background :pattern-color="isDark ? '#333' : '#aaa'" :gap="40" />
      <MiniMap />
      <Controls />

      <template #node-default="{ data }">
        <div
          class="border rounded-lg bg-white p-2 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
          :class="{ 'border-blue-500': data.message?.role === 'assistant' }"
        >
          {{ data.label }}
        </div>
      </template>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/controls/dist/style.css';
@import '@vue-flow/minimap/dist/style.css';
</style>
