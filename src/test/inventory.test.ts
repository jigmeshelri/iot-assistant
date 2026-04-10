import { vi, describe, it, expect, beforeEach } from 'vitest'
import { updateInventoryItem, deleteStockItem, addComponentToStock } from '../lib/inventory'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))
const mockFrom = vi.fn()
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } })
const mockStorageUpload = vi.fn().mockResolvedValue({ data: { path: 'user-1/comp-1/x.jpg' }, error: null })
const mockStorageFrom = vi.fn(() => ({ upload: mockStorageUpload }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    storage: { from: mockStorageFrom },
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
  const mockComponentsUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const mockComponentsUpdate = vi.fn(() => ({ eq: mockComponentsUpdateEq }))

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
    mockSelectSingle.mockResolvedValue({ data: { id: 'comp-1', sku: 'MCU-001' }, error: null })
    mockStockInsert.mockResolvedValue({ error: null })
    mockStorageUpload.mockResolvedValue({ data: { path: 'user-1/comp-1/x.jpg' }, error: null })
    mockComponentsUpdateEq.mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'components') return { upsert: mockUpsert, update: mockComponentsUpdate }
      if (table === 'stock') return { insert: mockStockInsert }
      return {}
    })
  })

  it('upserts component and inserts stock, returns component id', async () => {
    const result = await addComponentToStock(input)
    expect(result.componentId).toBe('comp-1')
    expect(result.error).toBeNull()
  })

  it('returns auth error when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const result = await addComponentToStock(input)
    expect(result.error).toEqual({ type: 'auth', message: 'Not authenticated' })
    expect(result.componentId).toBeNull()
  })

  it('returns sku_conflict error when upsert fails with Postgres 23505', async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    const result = await addComponentToStock(input)
    expect(result.error?.type).toBe('sku_conflict')
    expect(result.componentId).toBeNull()
  })

  it('returns unknown error when upsert fails with a non-conflict error', async () => {
    mockSelectSingle.mockResolvedValueOnce({ data: null, error: { code: '42P01', message: 'relation does not exist' } })
    const result = await addComponentToStock(input)
    expect(result.error?.type).toBe('unknown')
    expect(result.error?.message).toBe('relation does not exist')
  })

  it('returns unknown error when stock insert fails', async () => {
    mockStockInsert.mockResolvedValueOnce({ error: { message: 'stock error' } })
    const result = await addComponentToStock(input)
    expect(result.error).toEqual({ type: 'unknown', message: 'stock error' })
    expect(result.componentId).toBeNull()
  })

  it('does not touch storage or update image_url when no imageFile', async () => {
    await addComponentToStock(input)
    expect(mockStorageFrom).not.toHaveBeenCalled()
    expect(mockComponentsUpdate).not.toHaveBeenCalled()
  })

  it('uploads image to component-images bucket under user/component folder and sets image_url', async () => {
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await addComponentToStock({ ...input, imageFile: file })

    expect(result.error).toBeNull()
    expect(result.componentId).toBe('comp-1')
    expect(mockStorageFrom).toHaveBeenCalledWith('component-images')
    expect(mockStorageUpload).toHaveBeenCalledTimes(1)
    const [uploadPath, uploadedFile] = mockStorageUpload.mock.calls[0]
    expect(typeof uploadPath).toBe('string')
    expect(uploadPath).toMatch(/^user-1\/comp-1\/.+\.jpg$/)
    expect(uploadedFile).toBe(file)

    expect(mockComponentsUpdate).toHaveBeenCalledTimes(1)
    expect(mockComponentsUpdate).toHaveBeenCalledWith({ image_url: uploadPath })
    expect(mockComponentsUpdateEq).toHaveBeenCalledWith('id', 'comp-1')
  })

  it('returns error when image upload fails and does not insert stock', async () => {
    mockStorageUpload.mockResolvedValueOnce({ data: null, error: { message: 'upload failed' } })
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' })
    const result = await addComponentToStock({ ...input, imageFile: file })
    expect(result.error).toEqual({ type: 'unknown', message: 'upload failed' })
    expect(result.componentId).toBeNull()
    expect(mockStockInsert).not.toHaveBeenCalled()
  })

  it('derives extension from MIME type when filename has no extension', async () => {
    const file = new File(['fake'], 'photo', { type: 'image/png' })
    await addComponentToStock({ ...input, imageFile: file })
    const [uploadPath] = mockStorageUpload.mock.calls[0]
    expect(uploadPath).toMatch(/\.png$/)
  })

  it('lowercases the extension when filename uses uppercase', async () => {
    const file = new File(['fake'], 'PHOTO.JPEG', { type: 'image/jpeg' })
    await addComponentToStock({ ...input, imageFile: file })
    const [uploadPath] = mockStorageUpload.mock.calls[0]
    expect(uploadPath).toMatch(/\.jpeg$/)
  })

  it('falls back to .bin when filename and MIME type yield no extension', async () => {
    const file = new File(['fake'], 'photo', { type: 'application/octet-stream' })
    await addComponentToStock({ ...input, imageFile: file })
    const [uploadPath] = mockStorageUpload.mock.calls[0]
    expect(uploadPath).toMatch(/\.bin$/)
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
