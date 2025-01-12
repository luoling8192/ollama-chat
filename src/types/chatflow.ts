import type { Edge, Node } from '@vue-flow/core'

export interface MessageNodeData {
  role: 'user' | 'assistant' | 'system'
  content: string
  messageId: string
}
export type ChatNode = Node<MessageNodeData>
export type ChatEdge = Edge
