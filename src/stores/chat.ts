import type { Branch, BranchNode, Message, ModelParameters, Thread } from '~/types/index'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { OpenAIAdapter } from '~/adapters/model/openai'
import { db } from '~/modules/database'

export const useChatStore = defineStore('chat', () => {
  const activeThreadId = ref<string | undefined>(undefined)
  const activeBranchId = ref<string | undefined>(undefined)
  const threads = ref<Record<string, Thread>>({})
  const messages = ref<Record<string, Message>>({})
  const branches = ref<Record<string, Branch>>({})
  const isLoading = ref(false)
  const error = ref<Error | undefined>(undefined)

  const currentMessages = computed((): Message[] => {
    return Object.values(messages.value)
      .filter(msg => msg.threadId === activeThreadId.value)
      .sort((a, b) => a.timestamp - b.timestamp)
  })

  const rawCurrentMessages = computed((): Message[] => {
    return toRaw(currentMessages.value)
  })

  const currentBranches = computed((): Branch[] => {
    return Object.values(branches.value)
      .filter(branch => branch.threadId === activeThreadId.value)
      .sort((a, b) => a.createdAt - b.createdAt)
  })

  const currentThread = computed((): Thread | undefined => {
    return activeThreadId.value ? threads.value[activeThreadId.value] : undefined
  })

  const currentBranch = computed((): Branch | undefined => {
    return activeBranchId.value ? branches.value[activeBranchId.value] : undefined
  })

  const branchTree = computed((): BranchNode[] => {
    if (!currentThread.value)
      return []
    return buildBranchTree(Object.values(branches.value))
  })

  async function createThread(title: string): Promise<Thread> {
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
    threads.value[thread.id] = thread
    activeThreadId.value = thread.id

    return thread
  }

  async function sendMessage(content: string): Promise<void> {
    if (!activeThreadId.value)
      throw new Error('No active thread')

    const message: Message = {
      id: crypto.randomUUID(),
      threadId: activeThreadId.value,
      branchId: activeBranchId.value || 'main',
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
    messages.value[message.id] = message

    // Get context messages for the current branch
    const contextMessages = Object.values(messages.value)
      .filter(msg =>
        msg.threadId === activeThreadId.value
        && msg.branchId === (activeBranchId.value || 'main')
        && msg.timestamp <= message.timestamp,
      )
      .sort((a, b) => a.timestamp - b.timestamp)

    await generateResponse(message, contextMessages)
  }
  async function generateResponse(userMessage: Message, contextMessages: Message[]): Promise<void> {
    if (!currentThread.value)
      throw new Error('No active thread')

    const model = new OpenAIAdapter(currentThread.value)
    const thread = threads.value[userMessage.threadId]
    const startTime = Date.now()

    try {
      isLoading.value = true

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
      messages.value[message.id] = message

      let fullContent = ''

      for await (const chunk of model.streamResponse(
        contextMessages,
        thread.metadata.parameters,
      )) {
        fullContent += chunk.content
        message.content.value = fullContent
        messages.value[message.id] = { ...message }
      }

      message.metadata.processingTime = Date.now() - startTime
      await db.updateMessage(message)
      messages.value[message.id] = { ...message }
    }
    catch (err) {
      error.value = err as Error
    }
    finally {
      isLoading.value = false
    }
  }

  async function createBranch(parentMessageId: string, name: string): Promise<void> {
    if (!activeThreadId.value)
      throw new Error('No active thread')

    const branch: Branch = {
      id: crypto.randomUUID(),
      threadId: activeThreadId.value,
      parentMessageId,
      name,
      messages: [],
      createdAt: Date.now(),
    }

    await db.createBranch(branch)

    const parentMessage = messages.value[parentMessageId]
    if (!parentMessage)
      throw new Error('Parent message not found')

    const contextMessages = await getMessageContext(parentMessageId)

    for (const msg of contextMessages) {
      const branchMessage: Message = {
        ...msg,
        id: crypto.randomUUID(),
        branchId: branch.id,
      }
      await db.addMessage(branchMessage)
      messages.value[branchMessage.id] = branchMessage
    }

    branches.value[branch.id] = branch
    activeBranchId.value = branch.id

    const thread = threads.value[activeThreadId.value]
    thread.branches.push(branch)
    await db.updateThread(thread)
  }

  async function switchBranch(branchId: string): Promise<void> {
    const branch = branches.value[branchId]
    if (!branch)
      throw new Error('Branch not found')

    activeBranchId.value = branchId

    const msgs = await db.getMessages(branch.threadId, branchId)
    msgs.forEach((msg) => {
      messages.value[msg.id] = msg
    })
  }

  async function getMessageContext(messageId: string): Promise<Message[]> {
    const message = messages.value[messageId]
    const thread = threads.value[message.threadId]

    return Object.values(messages.value)
      .filter(msg =>
        msg.threadId === thread.id
        && msg.branchId === message.branchId
        && msg.timestamp <= message.timestamp,
      )
      .sort((a, b) => a.timestamp - b.timestamp)
  }

  function buildBranchTree(branches: Branch[]): BranchNode[] {
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
        const parentMessage = messages.value[branch.parentMessageId]
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
  }

  async function updateThreadModel(modelId: string, params: ModelParameters): Promise<void> {
    if (!currentThread.value)
      throw new Error('No active thread')

    const thread = currentThread.value
    thread.metadata.model = modelId
    thread.metadata.parameters = params
    thread.updatedAt = Date.now()

    await db.updateThread(thread)
  }

  async function clearState(): Promise<void> {
    messages.value = {}
    branches.value = {}
    activeThreadId.value = undefined
    activeBranchId.value = undefined
    error.value = undefined
  }

  async function switchThread(thread: Thread): Promise<void> {
    await clearState()

    // 加载线程数据
    threads.value[thread.id] = thread
    activeThreadId.value = thread.id

    // 加载所有消息和分支
    const msgs = await db.getMessages(thread.id)
    const branchList = await db.getBranches(thread.id)

    // 更新 store 中的数据
    msgs.forEach((msg) => {
      messages.value[msg.id] = msg
    })

    branchList.forEach((branch) => {
      branches.value[branch.id] = branch
    })

    // 更新线程的消息和分支列表
    thread.messages = msgs
    thread.branches = branchList

    // 更新 store 中的线程数据
    threads.value[thread.id] = { ...thread }
  }

  async function handleBranch(messageId: string): Promise<void> {
    if (!currentThread.value)
      return

    const newThread = await createThread(`Branch from ${messageId}`)

    const contextMessages = await getMessageContext(messageId)

    // 复制消息到新线程
    for (const msg of contextMessages) {
      const newMessage = {
        ...msg,
        id: crypto.randomUUID(),
        threadId: newThread.id,
        branchId: 'main',
      }
      await db.addMessage(newMessage)
      messages.value[newMessage.id] = newMessage
    }

    // 更新新线程的消息列表
    newThread.messages = Object.values(messages.value)
      .filter(msg => msg.threadId === newThread.id)

    // 更新 store 中的线程数据
    threads.value[newThread.id] = { ...newThread }

    await switchThread(newThread)
  }

  async function deleteThread(threadId: string): Promise<void> {
    const msgs = await db.getMessages(threadId)
    const branchList = await db.getBranches(threadId)

    msgs.forEach(message => delete messages.value[message.id])
    branchList.forEach(branch => delete branches.value[branch.id])

    delete threads.value[threadId]
    await db.deleteThread(threadId)

    if (threadId === activeThreadId.value)
      await clearState()
  }

  async function updateThread(thread: Thread): Promise<void> {
    const updatedThread = {
      ...thread,
      messages: threads.value[thread.id]?.messages || [],
      branches: threads.value[thread.id]?.branches || [],
    }
    threads.value[thread.id] = updatedThread

    await db.updateThread(thread)

    if (thread.id === activeThreadId.value)
      await loadThreadData(thread.id)
  }

  async function loadThreadData(threadId: string): Promise<void> {
    const msgs = await db.getMessages(threadId)
    const branchList = await db.getBranches(threadId)

    msgs.forEach((msg) => {
      messages.value[msg.id] = msg
    })

    branchList.forEach((branch) => {
      branches.value[branch.id] = branch
    })
  }

  return {
    activeThreadId,
    activeBranchId,
    threads,
    messages,
    branches,
    isLoading,
    error,
    currentThread,
    currentBranch,
    currentMessages,
    rawCurrentMessages,
    currentBranches,
    branchTree,
    createThread,
    sendMessage,
    generateResponse,
    createBranch,
    switchBranch,
    getMessageContext,
    buildBranchTree,
    updateThreadModel,
    clearState,
    switchThread,
    deleteThread,
    updateThread,
    loadThreadData,
    handleBranch,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useChatStore as any, import.meta.hot))
