import type { Branch, Message, Thread } from '~/types'

export interface StorageAdapter {
  // 基本 CRUD
  createThread: (thread: Thread) => Promise<void>
  getThread: (id: string) => Promise<Thread>
  updateThread: (thread: Thread) => Promise<void>
  deleteThread: (id: string) => Promise<void>

  // 消息操作
  addMessage: (message: Message) => Promise<void>
  getMessages: (threadId: string, branchId?: string) => Promise<Message[]>
  updateMessage: (message: Message) => Promise<void>

  // 分支操作
  createBranch: (branch: Branch) => Promise<void>
  getBranches: (threadId: string) => Promise<Branch[]>

  // 查询功能
  searchThreads: (query: string) => Promise<Thread[]>
  searchMessages: (query: string) => Promise<Message[]>
}
