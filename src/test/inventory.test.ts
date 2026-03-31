import { vi, describe, it, expect, beforeEach } from 'vitest'
import { updateInventoryItem, deleteStockItem } from '../lib/inventory'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockFrom = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
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
