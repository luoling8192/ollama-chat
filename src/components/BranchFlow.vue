<script setup lang="ts">
import type { Edge, Node, NodeMouseEvent } from '@vue-flow/core'
import type { Branch, Message, Thread } from '~/types'
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

interface FlowNodeData {
  label: string
}

interface MessageNodeData extends FlowNodeData {
  message: Message
}

interface BranchNodeData extends FlowNodeData {
  branch: Branch
}

type FlowNode = Node<MessageNodeData> | Node<BranchNodeData>

const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useVueFlow()

const LAYOUT_CONFIG = {
  VERTICAL_SPACING: 80,
  HORIZONTAL_SPACING: 200,
  BRANCH_OFFSET: 50,
} as const

function createMessageNode(message: Message): Node<MessageNodeData> {
  const truncatedContent = message.content.value.slice(0, 50) + (message.content.value.length > 50 ? '...' : '')

  return {
    id: message.id,
    type: 'default',
    position: { x: 0, y: 0 },
    data: {
      label: truncatedContent,
      message,
    },
  }
}

function createBranchNode(branch: Branch): Node<BranchNodeData> {
  return {
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
  }
}

function createNodes(messages: Message[], branches: Branch[]): FlowNode[] {
  const messageNodes = messages.map(createMessageNode)
  const branchNodes = branches.map(createBranchNode)
  return [...messageNodes, ...branchNodes]
}

function createMessageEdge(sourceId: string, targetId: string): Edge {
  return {
    id: `${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    type: 'smoothstep',
  }
}

function createBranchEdge(parentMessageId: string, branchId: string): Edge {
  return {
    id: `${parentMessageId}-${branchId}`,
    source: parentMessageId,
    target: branchId,
    type: 'smoothstep',
    style: { stroke: '#6366f1' },
  }
}

function createEdges(messages: Message[], branches: Branch[]): Edge[] {
  const messageEdges = messages.slice(1).map((msg, index) =>
    createMessageEdge(messages[index].id, msg.id),
  )

  const branchEdges = branches
    .filter(branch => branch.parentMessageId)
    .map(branch => createBranchEdge(branch.parentMessageId!, branch.id))

  return [...messageEdges, ...branchEdges]
}

function layoutNodes(nodes: FlowNode[], branches: Branch[]) {
  let currentY = 0

  branches.forEach((branch, branchIndex) => {
    const branchMessages = nodes.filter(
      node => node.data && 'message' in node.data && node.data.message.branchId === branch.id,
    )

    const branchNode = nodes.find(node => node.id === branch.id)
    if (branchNode) {
      branchNode.position = {
        x: branchIndex * LAYOUT_CONFIG.HORIZONTAL_SPACING,
        y: currentY,
      }
    }

    branchMessages.forEach((node, index) => {
      node.position = {
        x: branchIndex * LAYOUT_CONFIG.HORIZONTAL_SPACING + LAYOUT_CONFIG.BRANCH_OFFSET,
        y: currentY + (index + 1) * LAYOUT_CONFIG.VERTICAL_SPACING,
      }
    })

    currentY += (branchMessages.length + 2) * LAYOUT_CONFIG.VERTICAL_SPACING
  })
}

function updateFlow(thread: Thread | null) {
  if (!thread)
    return

  const allMessages = Object.values(chatStore.messages)
    .filter(msg => msg.threadId === thread.id)
  const newNodes = createNodes(allMessages, thread.branches)
  const newEdges = createEdges(allMessages, thread.branches)

  layoutNodes(newNodes, thread.branches)

  nodes.value = newNodes as any
  edges.value = newEdges as any
}

watch(
  () => chatStore.currentThread,
  updateFlow,
  { immediate: true },
)

async function scrollToFirstMessage(branchId: string) {
  const branchMessages = Object.values(chatStore.messages)
    .filter(m => m.branchId === branchId)
    .sort((a, b) => a.timestamp - b.timestamp)

  if (branchMessages.length > 0) {
    await nextTick()
    const messageEl = document.getElementById(`message-${branchMessages[0].id}`)
    messageEl?.scrollIntoView({ behavior: 'smooth' })
  }
}

function onNodeClick(event: NodeMouseEvent, node: FlowNode) {
  if (!node.data)
    return

  if ('message' in node.data) {
    emit('branch', node.data.message)
  }
  else if ('branch' in node.data) {
    void chatStore.switchBranch(node.data.branch.id).then(() => {
      void scrollToFirstMessage(node.data.branch.id)
    })
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
