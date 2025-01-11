import type { ViteSSGContext } from 'vite-ssg'

export type UserModule = (ctx: ViteSSGContext) => void | Promise<void>

// 核心领域模型定义
export interface Thread {
  id: string
  title: string
  messages: Message[]
  branches: Branch[]
  metadata: ThreadMetadata
  createdAt: number
  updatedAt: number
}

export interface Message {
  id: string
  threadId: string
  branchId: string
  parentId?: string
  role: 'user' | 'assistant' | 'system'
  content: Content
  timestamp: number
  metadata: MessageMetadata
}

export interface Branch {
  id: string
  threadId: string
  parentMessageId?: string
  name: string
  messages: Message[]
  createdAt: number
}

export interface Content {
  type: 'text' | 'markdown' | 'code' | 'image'
  value: string
  language?: string
  mimeType?: string
}

export interface ThreadMetadata {
  model: string
  parameters: ModelParameters
  tags: string[]
  favorite: boolean
  archived: boolean
}

export interface MessageMetadata {
  tokens: number
  processingTime: number
  error?: string
  retries?: number
}

export interface ModelParameters {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
}

export interface BranchNode {
  branch: Branch
  children: BranchNode[]
  depth: number
}
