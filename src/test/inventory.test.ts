import { vi, describe, it, expect, beforeEach } from 'vitest'
import { updateInventoryItem, deleteStockItem, addComponentToStock } from '../lib/inventory'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockFrom = vi.fn()
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'components') return { update: mockUpdate }
    if (table === 'stock') return { update: mockUpdate, delete: mockDelete }
    return {}
  })
  mockEq.mockResolvedValue({ error: null })
  mockDeleteEq.mockResolvedValue({ error: null })
})

describe('updateInventoryItem', () => {
  const compInput = {
    name: 'ESP32',
    category: 'Microcontrolador',
    platform_family: 'ESP32' as string | null,
    connectivity_caps: { wifi: true },
    technical_specs: { voltage: '3.3V' },
    datasheet_url: null as string | null,
  }

  const stockInput = {
    location_id: 'loc-1' as string | null,
    notes: null as string | null,
  }

  it('updates component and stock without error', async () => {
    const result = await updateInventoryItem('comp-1', 'stock-1', compInput, stockInput)
    expect(result.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('components')
    expect(mockFrom).toHaveBeenCalledWith('stock')
  })

  it('returns error message if component update fails', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'components') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: { message: 'comp error' } }) })) }
      return { update: mockUpdate, delete: mockDelete }
    })
    const result = await updateInventoryItem('comp-1', 'stock-1', compInput, stockInput)
    expect(result.error).toBe('comp error')
  })

  it('returns error message if stock update fails', async () => {
    const mockStockEq = vi.fn().mockResolvedValue({ error: { message: 'stock error' } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'components') return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }
      if (table === 'stock') return { update: vi.fn(() => ({ eq: mockStockEq })) }
      return {}
    })
    const result = await updateInventoryItem('comp-1', 'stock-1', compInput, stockInput)
    expect(result.error).toBe('stock error')
  })
})

describe('addComponentToStock', () => {
  const mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'comp-1', sku: 'MCU-001' }, error: null })
  const mockUpsertSelect = vi.fn(() => ({ single: mockSelectSingle }))
  const mockUpsert = vi.fn(() => ({ select: mockUpsertSelect }))
  const mockStockInsert = vi.fn().mockResolvedValue({ error: null })

  const input = {
    sku: 'MCU-001',
    name: 'ESP32',
    category: 'Microcontrolador',
    platform_family: null as string | null,
    technical_specs: {} as Record<string, string>,
    datasheet_url: null as string | null,
    connectivity_caps: {} as Record<string, boolean>,
    quantity: 2,
    notes: null as string | null,
    location_id: null as string | null,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'components') return { upsert: mockUpsert }
      if (table === 'stock') return { insert: mockStockInsert }
      return {}
    })
  })

  it('upserts component and inserts stock, returns component id', async () => {
    const result = await addComponentToStock(input)
    expect(result.componentId).toBe('comp-1')
    expect(result.error).toBeNull()
  })

  it('returns error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await addComponentToStock(input)
    expect(result.error).toBe('Not authenticated')
    expect(result.componentId).toBeNull()
  })

  it('returns error when component upsert fails', async () => {
    mockSelectSingle.mockResolvedValueOnce({ data: null, error: { message: 'upsert failed' } })
    const result = await addComponentToStock(input)
    expect(result.error).toBe('upsert failed')
    expect(result.componentId).toBeNull()
  })

  it('returns error when stock insert fails', async () => {
    mockStockInsert.mockResolvedValueOnce({ error: { message: 'stock error' } })
    const result = await addComponentToStock(input)
    expect(result.error).toBe('stock error')
    expect(result.componentId).toBeNull()
  })
})

describe('deleteStockItem', () => {
  it('deletes stock item successfully', async () => {
    const result = await deleteStockItem('stock-1')
    expect(result.error).toBeNull()
    expect(mockFrom).toHaveBeenCalledWith('stock')
    expect(mockDelete).toHaveBeenCalled()
    expect(mockDeleteEq).toHaveBeenCalledWith('id', 'stock-1')
  })

  it('returns error message on failure', async () => {
    mockDeleteEq.mockResolvedValueOnce({ error: { message: 'delete failed' } })
    const result = await deleteStockItem('stock-1')
    expect(result.error).toBe('delete failed')
  })
})
