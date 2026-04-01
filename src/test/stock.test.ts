import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getUserStock } from '../lib/stock'

const mockSelect = vi.fn()
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: mockFrom,
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getUserStock', () => {
  it('returns mapped inventory items', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          quantity: 3,
          component: {
            id: 'comp-1',
            name: 'ESP32',
            category: 'Microcontrolador',
            platform_family: 'ESP32',
            connectivity_caps: { wifi: true, ble: true },
            technical_specs: { voltage: '3.3V' },
          },
        },
      ],
      error: null,
    })

    const result = await getUserStock()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      component_id: 'comp-1',
      name: 'ESP32',
      category: 'Microcontrolador',
      quantity: 3,
      platform_family: 'ESP32',
      connectivity_caps: { wifi: true, ble: true },
      specs: { voltage: '3.3V' },
    })
  })

  it('returns empty array when stock is null', async () => {
    mockSelect.mockResolvedValue({ data: null, error: null })
    const result = await getUserStock()
    expect(result).toEqual([])
  })

  it('handles items with null component', async () => {
    mockSelect.mockResolvedValue({
      data: [{ quantity: 1, component: null }],
      error: null,
    })
    const result = await getUserStock()
    expect(result[0].component_id).toBeNull()
    expect(result[0].name).toBeNull()
    expect(result[0].category).toBeNull()
  })

  it('throws when supabase returns an error', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    await expect(getUserStock()).rejects.toThrow('DB error')
  })

  it('queries the stock table with components join', async () => {
    mockSelect.mockResolvedValue({ data: [], error: null })
    await getUserStock()
    expect(mockFrom).toHaveBeenCalledWith('stock')
    expect(mockSelect).toHaveBeenCalledWith(
      'quantity, component:components(id,name,category,platform_family,connectivity_caps,technical_specs)'
    )
  })
})
