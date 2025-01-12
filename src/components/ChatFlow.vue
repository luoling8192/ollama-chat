<script setup lang="ts">
import type { Edge, Node } from '@vue-flow/core'
import type { Branch, Message } from '~/types'
import { useLogg } from '@guiiai/logg'
import { VueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'

interface MessageNodeData {
  role: 'user' | 'assistant' | 'system'
  content: string
  messageId: string
}

type ChatNode = Node<MessageNodeData>
type ChatEdge = Edge

interface Position {
  x: number
  y: number
}

const props = defineProps<{
  messages: Message[]
  branches: Branch[]
}>()

const logger = useLogg('ChatFlow').useGlobalConfig()
const nodes = ref<ChatNode[]>([])
const edges = ref<ChatEdge[]>([])

const SPACING = {
  HORIZONTAL: 300,
  VERTICAL: 100,
} as const

// Flow node creation
function createNode(message: Message, position: Position): ChatNode {
  logger.withFields({ messageId: message.id, position }).debug('Creating node')
  return {
    id: message.id,
    type: 'messageNode',
    position,
    data: {
      role: message.role,
      content: typeof message.content === 'string' ? message.content : message.content.value,
      messageId: message.id,
    },
  }
}

function createRootNode(): ChatNode {
  logger.withFields({ type: 'root' }).debug('Creating root node')
  return createNode(
    {
      id: 'root',
      role: 'system',
      content: { value: 'Chat Start' },
    } as Message,
    { x: 0, y: 0 },
  )
}

function createEdge(sourceId: string, targetId: string): ChatEdge {
  logger.withFields({ sourceId, targetId }).debug('Creating edge')
  return {
    id: `e-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
  }
}

// Position calculation
function calculatePosition(branchIndex: number, messageIndex: number): Position {
  const position = {
    x: branchIndex * SPACING.HORIZONTAL,
    y: messageIndex * SPACING.VERTICAL,
  }
  logger.withFields({ branchIndex, messageIndex, position }).debug('Calculating position')
  return position
}

// Branch processing
function processBranch(messages: Message[], startX: number, startY: number, initialParentId: string, flowNodes: ChatNode[], flowEdges: ChatEdge[]): void {
  logger.withFields({ messagesCount: messages.length, startX, startY, initialParentId }).debug('Processing branch')
  let currentParentId = initialParentId

  messages.forEach((message) => {
    const node = createNode(message, { x: startX, y: startY })
    flowNodes.push(node)

    const isFirstMessageInBranch = message.id === messages[0].id
    if (currentParentId !== 'root' || !isFirstMessageInBranch) {
      flowEdges.push(createEdge(currentParentId, message.id))
    }

    currentParentId = message.id
  })
}

// Flow elements construction
function constructFlowElements(messages: Message[], branches: Branch[]) {
  logger.withFields({ messagesCount: messages.length, branchesCount: branches.length }).debug('Constructing flow elements')
  const flowNodes: ChatNode[] = [createRootNode()]
  const flowEdges: ChatEdge[] = []

  // Process main message thread
  const mainBranchPosition = calculatePosition(0, 1)
  processBranch(messages, mainBranchPosition.x, mainBranchPosition.y, 'root', flowNodes, flowEdges)

  // Process branches
  branches.forEach((branch, index) => {
    const parentMessage = messages.find(m => m.id === branch.parentMessageId)
    if (!parentMessage)
      return

    const parentIndex = messages.indexOf(parentMessage)
    const position = calculatePosition(index + 1, parentIndex + 1)

    processBranch(
      branch.messages,
      position.x,
      position.y,
      branch.parentMessageId || 'root',
      flowNodes,
      flowEdges,
    )
  })

  return { nodes: flowNodes, edges: flowEdges }
}

// Update flow on props change
watch(
  [() => props.messages, () => props.branches],
  ([newMessages, newBranches]) => {
    logger.withFields({ messagesCount: newMessages.length, branchesCount: newBranches.length }).debug('Updating flow')
    const { nodes: flowNodes, edges: flowEdges } = constructFlowElements(newMessages, newBranches)
    nodes.value = flowNodes
    edges.value = flowEdges
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <VueFlow
    v-model="nodes"
    v-model:edges="edges"
    :default-viewport="{ zoom: 1 }"
    class="chat-flow"
  >
    <template #node-messageNode="props">
      <MessageNode :data="props.data" />
    </template>
  </VueFlow>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.chat-flow {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
}
</style>
