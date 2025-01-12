<script setup lang="ts">
import type { Branch, Message } from '~/types'
import type { ChatEdge, ChatNode } from '~/types/chatflow'
import { useLogg } from '@guiiai/logg'
import { Background } from '@vue-flow/background'
import { useVueFlow, VueFlow } from '@vue-flow/core'
import { ref, watch } from 'vue'
import { useLayout } from '~/composables/layout'

interface Position {
  x: number
  y: number
}

interface FlowConfig {
  spacing: {
    horizontal: number
    vertical: number
  }
  defaultViewport: {
    zoom: number
  }
  backgroundColor: string
}

const props = withDefaults(defineProps<{
  messages: Message[]
  branches: Branch[]
  config?: Partial<FlowConfig>
}>(), {
  config: () => ({}),
})

const emit = defineEmits<{
  close: []
}>()

const logger = useLogg('ChatFlow').useGlobalConfig()
const nodes = ref<ChatNode[]>([])
const edges = ref<ChatEdge[]>([])

// Default configuration that can be overridden via props
const flowConfig = computed<FlowConfig>(() => ({
  spacing: {
    horizontal: 100,
    vertical: 300,
    ...props.config?.spacing,
  },
  defaultViewport: {
    zoom: 1,
    ...props.config?.defaultViewport,
  },
  backgroundColor: '#1a1a1a',
  ...props.config,
}))

// Flow node factory
const nodeFactory = {
  createMessageNode(message: Message, position: Position): ChatNode {
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
  },

  createRootNode(): ChatNode {
    logger.withFields({ type: 'root' }).debug('Creating root node')
    return this.createMessageNode(
      {
        id: 'root',
        role: 'system',
        content: { value: 'Chat Start' },
      } as Message,
      { x: 0, y: 0 },
    )
  },
}

// Edge factory
const edgeFactory = {
  create(sourceId: string, targetId: string): ChatEdge {
    logger.withFields({ sourceId, targetId }).debug('Creating edge')
    return {
      id: `e-${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
    }
  },
}

// Position calculator
const positionCalculator = {
  calculate(branchIndex: number, messageIndex: number): Position {
    const position = {
      x: branchIndex * flowConfig.value.spacing.horizontal,
      y: messageIndex * flowConfig.value.spacing.vertical,
    }
    logger.withFields({ branchIndex, messageIndex, position }).debug('Calculating position')
    return position
  },
}

// Branch processor
const branchProcessor = {
  process(messages: Message[], startX: number, startY: number, initialParentId: string, flowNodes: ChatNode[], flowEdges: ChatEdge[]): void {
    logger.withFields({ messagesCount: messages.length, startX, startY, initialParentId }).debug('Processing branch')
    let currentParentId = initialParentId

    messages.forEach((message) => {
      const node = nodeFactory.createMessageNode(message, { x: startX, y: startY })
      flowNodes.push(node)

      const isFirstMessageInBranch = message.id === messages[0].id
      if (currentParentId !== 'root' || !isFirstMessageInBranch) {
        flowEdges.push(edgeFactory.create(currentParentId, message.id))
      }

      currentParentId = message.id
    })
  },
}

// Flow builder
const flowBuilder = {
  build(messages: Message[], branches: Branch[]) {
    logger.withFields({ messagesCount: messages.length, branchesCount: branches.length }).debug('Constructing flow elements')
    const flowNodes: ChatNode[] = [nodeFactory.createRootNode()]
    const flowEdges: ChatEdge[] = []

    // Process main message thread
    const mainBranchPosition = positionCalculator.calculate(0, 1)
    branchProcessor.process(messages, mainBranchPosition.x, mainBranchPosition.y, 'root', flowNodes, flowEdges)

    // Process branches
    branches.forEach((branch, index) => {
      const parentMessage = messages.find(m => m.id === branch.parentMessageId)
      if (!parentMessage)
        return

      const parentIndex = messages.indexOf(parentMessage)
      const position = positionCalculator.calculate(index + 1, parentIndex + 1)

      branchProcessor.process(
        branch.messages,
        position.x,
        position.y,
        branch.parentMessageId || 'root',
        flowNodes,
        flowEdges,
      )
    })

    return { nodes: flowNodes, edges: flowEdges }
  },
}

const { layout } = useLayout()

const { fitView } = useVueFlow()

async function layoutGraph(direction: 'LR' | 'TB') {
  nodes.value = layout(nodes.value, edges.value, direction)

  nextTick(() => {
    fitView()
  })
}

// Update flow on props change
watch(
  [() => props.messages, () => props.branches],
  ([newMessages, newBranches]) => {
    logger.withFields({ messagesCount: newMessages.length, branchesCount: newBranches.length }).debug('Updating flow')
    const { nodes: flowNodes, edges: flowEdges } = flowBuilder.build(newMessages, newBranches)
    nodes.value = flowNodes
    edges.value = flowEdges
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div class="relative h-full w-full">
    <button
      class="transition-background absolute right-10px top-10px z-10 h-30px w-30px flex cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-20px text-white duration-200 hover:bg-white/20"
      @click="emit('close')"
    >
      ×
    </button>
    <VueFlow
      v-model="nodes"
      v-model:edges="edges"
      :default-viewport="{ zoom: 1.5 }"
      :min-zoom="0.2"
      :max-zoom="4"
      class="h-full w-full"
      @nodes-initialized="layoutGraph('TB')"
    >
      <Background />
      <template #node-messageNode="props">
        <MessageNode :data="props.data" />
      </template>
    </VueFlow>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>
