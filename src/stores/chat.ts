import type { Branch, BranchNode, Message, ModelParameters, Thread } from '~/types/index'
import { defineStore } from 'pinia'
import { OpenAIAdapter } from '~/adapters/model/openai'
import { db } from '~/modules/database'

interface ChatState {
  activeThreadId: string | null
  activeBranchId: string | null
  threads: Record<string, Thread>
  messages: Record<string, Message>
  branches: Record<string, Branch>
  isLoading: boolean
  error: Error | null
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    activeThreadId: null,
    activeBranchId: null,
    threads: {},
    messages: {},
    branches: {},
    isLoading: false,
    error: null,
  }),

  getters: {
    currentThread(): Thread | null {
      return this.activeThreadId ? this.threads[this.activeThreadId] : null
    },

    currentBranch(): Branch | null {
      return this.activeBranchId ? this.branches[this.activeBranchId] : null
    },

    branchTree(): BranchNode[] {
      if (!this.currentThread)
        return []
      return this.buildBranchTree(Object.values(this.branches))
    },
  },

  actions: {
    async createThread(title: string): Promise<Thread> {
      const thread: Thread = {
        id: crypto.randomUUID(),
        title,
        messages: [],
        branches: [],
        metadata: {
          model: 'gpt-3.5-turbo',
          parameters: {
            temperature: 0.7,
            maxTokens: 2048,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          tags: [],
          favorite: false,
          archived: false,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      await db.createThread(thread)
      this.threads[thread.id] = thread
      this.activeThreadId = thread.id

      return thread
    },

    async sendMessage(content: string): Promise<void> {
      if (!this.activeThreadId)
        throw new Error('No active thread')

      const message: Message = {
        id: crypto.randomUUID(),
        threadId: this.activeThreadId,
        branchId: this.activeBranchId || 'main',
        role: 'user',
        content: {
          type: 'text',
          value: content,
        },
        timestamp: Date.now(),
        metadata: {
          tokens: 0,
          processingTime: 0,
        },
      }

      await db.addMessage(message)

      this.messages[message.id] = message
      await this.generateResponse(message)
    },

    async generateResponse(userMessage: Message): Promise<void> {
      const model = new OpenAIAdapter(this.currentThread)
      const thread = this.threads[userMessage.threadId]
      const startTime = Date.now()

      try {
        this.isLoading = true

        const message: Message = {
          id: crypto.randomUUID(),
          threadId: userMessage.threadId,
          branchId: userMessage.branchId,
          role: 'assistant',
          content: {
            type: 'text',
            value: '',
          },
          timestamp: Date.now(),
          metadata: {
            tokens: 0,
            processingTime: 0,
          },
        }

        await db.addMessage(message)
        this.messages[message.id] = message

        let fullContent = ''

        for await (const chunk of model.streamResponse(
          userMessage.content.value,
          thread.metadata.parameters,
        )) {
          fullContent += chunk.content
          message.content.value = fullContent
          this.messages[message.id] = { ...message }
        }

        message.metadata.processingTime = Date.now() - startTime
        await db.updateMessage(message)
        this.messages[message.id] = { ...message }
      }
      catch (error) {
        this.error = error as Error
      }
      finally {
        this.isLoading = false
      }
    },

    async createBranch(parentMessageId: string, name: string): Promise<void> {
      if (!this.activeThreadId)
        throw new Error('No active thread')

      const branch: Branch = {
        id: crypto.randomUUID(),
        threadId: this.activeThreadId,
        parentMessageId,
        name,
        messages: [],
        createdAt: Date.now(),
      }

      await db.createBranch(branch)

      const parentMessage = this.messages[parentMessageId]
      if (!parentMessage)
        throw new Error('Parent message not found')

      const contextMessages = await this.getMessageContext(parentMessageId)

      for (const msg of contextMessages) {
        const branchMessage: Message = {
          ...msg,
          id: crypto.randomUUID(),
          branchId: branch.id,
        }
        await db.addMessage(branchMessage)
        this.messages[branchMessage.id] = branchMessage
      }

      this.branches[branch.id] = branch
      this.activeBranchId = branch.id

      const thread = this.threads[this.activeThreadId]
      thread.branches.push(branch)
      await db.updateThread(thread)
    },

    async switchBranch(branchId: string): Promise<void> {
      const branch = this.branches[branchId]
      if (!branch)
        throw new Error('Branch not found')

      this.activeBranchId = branchId

      const messages = await db.getMessages(branch.threadId, branchId)
      messages.forEach((msg) => {
        this.messages[msg.id] = msg
      })
    },

    async getMessageContext(messageId: string): Promise<Message[]> {
      const message = this.messages[messageId]
      const thread = this.threads[message.threadId]

      return Object.values(this.messages)
        .filter(msg =>
          msg.threadId === thread.id
          && msg.branchId === message.branchId
          && msg.timestamp <= message.timestamp,
        )
        .sort((a, b) => a.timestamp - b.timestamp)
    },

    buildBranchTree(branches: Branch[]): BranchNode[] {
      const nodeMap = new Map<string, BranchNode>()
      const rootNodes: BranchNode[] = []

      branches.forEach((branch) => {
        const node: BranchNode = {
          branch,
          children: [],
          depth: 0,
        }
        nodeMap.set(branch.id, node)
      })

      branches.forEach((branch) => {
        const node = nodeMap.get(branch.id)
        if (!node)
          return

        if (branch.parentMessageId) {
          const parentMessage = this.messages[branch.parentMessageId]
          if (!parentMessage)
            return

          const parentBranch = branches.find(b => b.id === parentMessage.branchId)
          if (parentBranch) {
            const parentNode = nodeMap.get(parentBranch.id)
            if (parentNode) {
              parentNode.children.push(node)
              node.depth = parentNode.depth + 1
            }
          }
          else {
            rootNodes.push(node)
          }
        }
        else {
          rootNodes.push(node)
        }
      })

      return rootNodes.sort((a, b) => a.branch.createdAt - b.branch.createdAt)
    },

    async updateThreadModel(modelId: string, params: ModelParameters): Promise<void> {
      if (!this.currentThread)
        throw new Error('No active thread')

      const thread = this.currentThread
      thread.metadata.model = modelId
      thread.metadata.parameters = params
      thread.updatedAt = Date.now()

      await db.updateThread(thread)
    },

    async clearState(): Promise<void> {
      this.messages = {}
      this.branches = {}
      this.activeThreadId = null
      this.activeBranchId = null
      this.error = null
    },

    async switchThread(thread: Thread): Promise<void> {
      await this.clearState()
      this.threads[thread.id] = thread
      this.activeThreadId = thread.id
      await this.loadThreadData(thread.id)
    },

    async deleteThread(threadId: string): Promise<void> {
      const messages = await db.getMessages(threadId)
      const branches = await db.getBranches(threadId)

      messages.forEach(message => delete this.messages[message.id])
      branches.forEach(branch => delete this.branches[branch.id])

      delete this.threads[threadId]
      await db.deleteThread(threadId)

      if (threadId === this.activeThreadId)
        await this.clearState()
    },

    async updateThread(thread: Thread): Promise<void> {
      this.threads[thread.id] = thread
      await db.updateThread(thread)

      if (thread.id === this.activeThreadId)
        await this.loadThreadData(thread.id)
    },

    async loadThreadData(threadId: string): Promise<void> {
      const messages = await db.getMessages(threadId)
      const branches = await db.getBranches(threadId)

      messages.forEach((msg) => {
        this.messages[msg.id] = msg
      })

      branches.forEach((branch) => {
        this.branches[branch.id] = branch
      })
    },
  },
})
