import { vi } from 'vitest'

// テストデータストア - 実際のデータベースをシミュレート
interface MockDatabase {
  stories: Record<string, any>
  workspaces: Record<string, any>
  videos: Record<string, any>
}

class MockSupabaseStore {
  private data: MockDatabase = {
    stories: {},
    workspaces: {},
    videos: {},
  }

  // データをリセット
  reset() {
    this.data = {
      stories: {},
      workspaces: {},
      videos: {},
    }
  }

  // データを設定
  setData(table: keyof MockDatabase, items: Record<string, any>[]) {
    this.data[table] = {}
    items.forEach(item => {
      this.data[table][item.id] = { ...item }
    })
  }

  // データを取得
  getData(table: keyof MockDatabase): any[] {
    return Object.values(this.data[table])
  }

  // 単一データを取得
  getItem(table: keyof MockDatabase, id: string): any | null {
    return this.data[table][id] || null
  }

  // データを追加
  addItem(table: keyof MockDatabase, item: any): any {
    const id = item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newItem = { ...item, id }
    this.data[table][id] = newItem
    return newItem
  }

  // データを更新
  updateItem(table: keyof MockDatabase, id: string, updates: any): any | null {
    if (!this.data[table][id]) return null
    this.data[table][id] = { ...this.data[table][id], ...updates }
    return this.data[table][id]
  }

  // データを削除
  deleteItem(table: keyof MockDatabase, id: string): boolean {
    if (!this.data[table][id]) return false
    delete this.data[table][id]
    return true
  }

  // フィルタリング
  filter(table: keyof MockDatabase, predicate: (item: any) => boolean): any[] {
    return Object.values(this.data[table]).filter(predicate)
  }

  // カウント
  count(table: keyof MockDatabase, predicate?: (item: any) => boolean): number {
    const items = Object.values(this.data[table])
    return predicate ? items.filter(predicate).length : items.length
  }
}

// グローバルストアインスタンス
export const mockStore = new MockSupabaseStore()

// Supabaseクエリビルダーのモック
interface MockQueryBuilder {
  select: vi.MockedFunction<any>
  insert: vi.MockedFunction<any>
  update: vi.MockedFunction<any>
  delete: vi.MockedFunction<any>
  eq: vi.MockedFunction<any>
  neq: vi.MockedFunction<any>
  gt: vi.MockedFunction<any>
  gte: vi.MockedFunction<any>
  lt: vi.MockedFunction<any>
  lte: vi.MockedFunction<any>
  like: vi.MockedFunction<any>
  in: vi.MockedFunction<any>
  order: vi.MockedFunction<any>
  range: vi.MockedFunction<any>
  limit: vi.MockedFunction<any>
  single: vi.MockedFunction<any>
  maybeSingle: vi.MockedFunction<any>
  then: vi.MockedFunction<any>
}

export interface MockSupabaseQueryState {
  table: keyof MockDatabase
  operation: 'select' | 'insert' | 'update' | 'delete'
  columns?: string[]
  filters: Array<{
    column: string
    operator: string
    value: any
  }>
  data?: any
  orderBy?: { column: string; ascending: boolean }[]
  rangeStart?: number
  rangeEnd?: number
  limitCount?: number
  returnSingle?: boolean
  returnMaybeSingle?: boolean
  countOnly?: boolean
  shouldError?: { code?: string; message: string }
}

export function createMockQueryBuilder(tableName: keyof MockDatabase): MockQueryBuilder {
  const state: MockSupabaseQueryState = {
    table: tableName,
    operation: 'select',
    filters: [],
  }

  const builder = {
    select: vi.fn((columns?: string) => {
      state.operation = 'select'
      state.columns = columns ? columns.split(',').map(c => c.trim()) : undefined
      state.countOnly = columns === '*' && columns.includes('count')
      return builder
    }),

    insert: vi.fn((data: any) => {
      state.operation = 'insert'
      state.data = data
      return builder
    }),

    update: vi.fn((data: any) => {
      state.operation = 'update'
      state.data = data
      return builder
    }),

    delete: vi.fn(() => {
      state.operation = 'delete'
      return builder
    }),

    eq: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'eq', value })
      return builder
    }),

    neq: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'neq', value })
      return builder
    }),

    gt: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'gt', value })
      return builder
    }),

    gte: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'gte', value })
      return builder
    }),

    lt: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'lt', value })
      return builder
    }),

    lte: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'lte', value })
      return builder
    }),

    like: vi.fn((column: string, value: any) => {
      state.filters.push({ column, operator: 'like', value })
      return builder
    }),

    in: vi.fn((column: string, value: any[]) => {
      state.filters.push({ column, operator: 'in', value })
      return builder
    }),

    order: vi.fn((column: string, options?: { ascending?: boolean }) => {
      if (!state.orderBy) state.orderBy = []
      state.orderBy.push({ 
        column, 
        ascending: options?.ascending ?? true 
      })
      return builder
    }),

    range: vi.fn((start: number, end: number) => {
      state.rangeStart = start
      state.rangeEnd = end
      return builder
    }),

    limit: vi.fn((count: number) => {
      state.limitCount = count
      return builder
    }),

    single: vi.fn(async () => {
      state.returnSingle = true
      return executeQuery(state)
    }),

    maybeSingle: vi.fn(async () => {
      state.returnMaybeSingle = true
      return executeQuery(state)
    }),

    then: vi.fn(async (resolve: Function) => {
      const result = await executeQuery(state)
      resolve(result)
      return result
    }),
  }

  return builder as MockQueryBuilder
}

// クエリを実行してSupabaseレスポンス形式で結果を返す
async function executeQuery(state: MockSupabaseQueryState): Promise<{ data: any; error: any; count?: number }> {
  try {
    // エラーシミュレーション
    if (state.shouldError) {
      return {
        data: null,
        error: {
          code: state.shouldError.code,
          message: state.shouldError.message
        }
      }
    }

    switch (state.operation) {
      case 'select':
        return executeSelect(state)
      case 'insert':
        return executeInsert(state)
      case 'update':
        return executeUpdate(state)
      case 'delete':
        return executeDelete(state)
      default:
        throw new Error(`Unsupported operation: ${state.operation}`)
    }
  } catch (error) {
    return {
      data: null,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

function executeSelect(state: MockSupabaseQueryState): { data: any; error: null; count?: number } {
  let items = mockStore.getData(state.table)

  // フィルタリング適用
  for (const filter of state.filters) {
    items = items.filter(item => applyFilter(item, filter))
  }

  // ソート適用
  if (state.orderBy) {
    items.sort((a, b) => {
      for (const order of state.orderBy!) {
        const valueA = a[order.column]
        const valueB = b[order.column]
        if (valueA < valueB) return order.ascending ? -1 : 1
        if (valueA > valueB) return order.ascending ? 1 : -1
      }
      return 0
    })
  }

  const totalCount = items.length

  // range/limit適用
  if (state.rangeStart !== undefined && state.rangeEnd !== undefined) {
    items = items.slice(state.rangeStart, state.rangeEnd + 1)
  } else if (state.limitCount !== undefined) {
    items = items.slice(0, state.limitCount)
  }

  // カウントクエリの場合
  if (state.countOnly) {
    return { data: null, error: null, count: totalCount }
  }

  // 結果の形式確認
  if (state.returnSingle) {
    const item = items[0] || null
    if (!item) {
      return {
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' }
      }
    }
    return { data: item, error: null }
  }

  if (state.returnMaybeSingle) {
    return { data: items[0] || null, error: null }
  }

  return { data: items, error: null, count: totalCount }
}

function executeInsert(state: MockSupabaseQueryState): { data: any; error: null } {
  if (Array.isArray(state.data)) {
    const insertedItems = state.data.map(item => mockStore.addItem(state.table, item))
    return { data: insertedItems, error: null }
  } else {
    const insertedItem = mockStore.addItem(state.table, state.data)
    return { data: [insertedItem], error: null }
  }
}

function executeUpdate(state: MockSupabaseQueryState): { data: any; error: null } {
  let updatedItems: any[] = []

  // フィルタに一致するアイテムを更新
  for (const filter of state.filters) {
    if (filter.column === 'id' && filter.operator === 'eq') {
      const updated = mockStore.updateItem(state.table, filter.value, state.data)
      if (updated) updatedItems.push(updated)
    }
  }

  return { data: updatedItems, error: null }
}

function executeDelete(state: MockSupabaseQueryState): { data: any; error: null } {
  let deletedItems: any[] = []

  // フィルタに一致するアイテムを削除
  for (const filter of state.filters) {
    if (filter.column === 'id' && filter.operator === 'eq') {
      const item = mockStore.getItem(state.table, filter.value)
      if (item && mockStore.deleteItem(state.table, filter.value)) {
        deletedItems.push(item)
      }
    }
  }

  return { data: deletedItems, error: null }
}

function applyFilter(item: any, filter: { column: string; operator: string; value: any }): boolean {
  const itemValue = item[filter.column]
  
  switch (filter.operator) {
    case 'eq':
      return itemValue === filter.value
    case 'neq':
      return itemValue !== filter.value
    case 'gt':
      return itemValue > filter.value
    case 'gte':
      return itemValue >= filter.value
    case 'lt':
      return itemValue < filter.value
    case 'lte':
      return itemValue <= filter.value
    case 'like':
      return String(itemValue).includes(String(filter.value).replace('%', ''))
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(itemValue)
    default:
      return true
  }
}

// Supabaseクライアントのモック作成
export function createMockSupabaseClient() {
  return {
    from: vi.fn((tableName: keyof MockDatabase) => createMockQueryBuilder(tableName)),
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
      })),
    },
  }
}