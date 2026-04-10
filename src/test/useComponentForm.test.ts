import { renderHook, act, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useComponentForm } from '../components/islands/hooks/useComponentForm'

const mockAddComponentToStock = vi.fn().mockResolvedValue({ componentId: 'c1', error: null })
const mockLike = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('../lib/inventory', () => ({
  addComponentToStock: (...args: unknown[]) => mockAddComponentToStock(...args),
}))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ like: mockLike })),
    })),
  }),
}))

Object.defineProperty(window, 'location', { writable: true, value: { href: '' } })

describe('useComponentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
    mockAddComponentToStock.mockResolvedValue({ componentId: 'c1', error: null })
    mockLike.mockResolvedValue({ data: [], error: null })
  })

  it('initializes fields from prefill', () => {
    const { result } = renderHook(() =>
      useComponentForm({ prefill: { name: 'DHT22', category: 'Sensor' } }),
    )
    expect(result.current.fields.name).toBe('DHT22')
    expect(result.current.fields.category).toBe('Sensor')
  })

  it('initializes with empty defaults when no prefill', () => {
    const { result } = renderHook(() => useComponentForm())
    expect(result.current.fields.name).toBe('')
    expect(result.current.fields.sku).toBe('')
    expect(result.current.fields.quantity).toBe(1)
    expect(result.current.fields.locationId).toBeNull()
  })

  it('setters update fields', () => {
    const { result } = renderHook(() => useComponentForm())
    act(() => result.current.setName('foo'))
    expect(result.current.fields.name).toBe('foo')
  })

  it('handleSubmit calls addComponentToStock with expected input shape', async () => {
    const imageFile = new File(['x'], 'x.png', { type: 'image/png' })
    const { result } = renderHook(() =>
      useComponentForm({
        prefill: { name: 'ESP32', category: 'Microcontrolador', platform_family: 'ESP32' },
        imageFile,
      }),
    )
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })
    expect(mockAddComponentToStock).toHaveBeenCalledOnce()
    const [input] = mockAddComponentToStock.mock.calls[0]
    expect(input).toMatchObject({
      name: 'ESP32',
      category: 'Microcontrolador',
      platform_family: 'ESP32',
      quantity: 1,
      location_id: null,
      imageFile,
    })
    expect(input).toHaveProperty('sku')
  })

  it('handleSubmit sets skuConflict on sku_conflict error', async () => {
    mockAddComponentToStock.mockResolvedValueOnce({
      componentId: null,
      error: { type: 'sku_conflict', message: 'dup' },
    })
    const { result } = renderHook(() =>
      useComponentForm({ prefill: { name: 'X', category: 'Sensor' } }),
    )
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent)
    })
    await waitFor(() => {
      expect(result.current.fields.skuConflict.length).toBeGreaterThan(0)
    })
    expect(result.current.error).toBe('dup')
  })
})
