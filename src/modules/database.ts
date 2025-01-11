import type { UserModule } from '~/types'
import { IndexedDBAdapter } from '~/adapters/storage/indexeddb'

// 创建一个单例实例
export const db = new IndexedDBAdapter()

export const install: UserModule = async () => {
  // 确保数据库初始化完成
  await db.init()
}
