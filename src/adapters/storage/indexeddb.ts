import type { StorageAdapter } from './base'
import type { Branch, Message, Thread } from '~/types'

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'chatbot'
  private readonly VERSION = 1
  private initPromise: Promise<void> | null = null

  async init(): Promise<void> {
    if (!this.initPromise)
      this.initPromise = this.initDB()
    return this.initPromise
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // 创建存储对象
        if (!db.objectStoreNames.contains('threads'))
          db.createObjectStore('threads', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('messages'))
          db.createObjectStore('messages', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('branches'))
          db.createObjectStore('branches', { keyPath: 'id' })
      }
    })
  }

  private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init()
    if (!this.db)
      throw new Error('Database not initialized')
    const transaction = this.db.transaction(name, mode)
    return transaction.objectStore(name)
  }

  // Thread 操作
  async createThread(thread: Thread): Promise<void> {
    const store = await this.getStore('threads', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.add(thread)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getThread(id: string): Promise<Thread> {
    const store = await this.getStore('threads')
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async updateThread(thread: Thread): Promise<void> {
    const store = await this.getStore('threads', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.put(thread)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async deleteThread(id: string): Promise<void> {
    const store = await this.getStore('threads', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Message 操作
  async addMessage(message: Message): Promise<void> {
    const store = await this.getStore('messages', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.add(message)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getMessages(threadId: string, branchId?: string): Promise<Message[]> {
    const store = await this.getStore('messages')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const messages = request.result as Message[]
        return resolve(
          messages.filter(m =>
            m.threadId === threadId
            && (!branchId || m.branchId === branchId),
          ),
        )
      }
    })
  }

  async updateMessage(message: Message): Promise<void> {
    const store = await this.getStore('messages', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.put(message)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  // Branch 操作
  async createBranch(branch: Branch): Promise<void> {
    const store = await this.getStore('branches', 'readwrite')
    await new Promise<void>((resolve, reject) => {
      const request = store.add(branch)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getBranches(threadId: string): Promise<Branch[]> {
    const store = await this.getStore('branches')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const branches = request.result as Branch[]
        resolve(branches.filter(b => b.threadId === threadId))
      }
    })
  }

  // 查询功能
  async searchThreads(query: string): Promise<Thread[]> {
    const store = await this.getStore('threads')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const threads = request.result as Thread[]
        resolve(threads.filter(t =>
          t.title.toLowerCase().includes(query.toLowerCase()),
        ))
      }
    })
  }

  async searchMessages(query: string): Promise<Message[]> {
    const store = await this.getStore('messages')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const messages = request.result as Message[]
        resolve(messages.filter(m =>
          m.content.value.toLowerCase().includes(query.toLowerCase()),
        ))
      }
    })
  }

  async getAllThreads(): Promise<Thread[]> {
    const store = await this.getStore('threads')
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const threads = request.result as Thread[]
        resolve(threads.sort((a, b) => b.updatedAt - a.updatedAt))
      }
    })
  }
}
