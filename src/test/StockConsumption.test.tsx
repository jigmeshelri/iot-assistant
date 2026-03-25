import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import StockConsumption from '../components/islands/StockConsumption'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockDelete = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
const mockSelect = vi.fn(() => ({
  eq: vi.fn(() => ({
    single: vi.fn().mockResolvedValue({ data: { quantity: 5 }, error: null }),
  })),
}))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn((_table: string) => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      select: mockSelect,
    })),
  }),
}))

Object.defineProperty(window, 'location', { writable: true, value: { href: '', reload: vi.fn() } })

const baseProps = {
  projectId: 'p1',
  bomItems: [
    { id: 'b1', component_name: 'ESP32-C6', quantity_required: 1 },
    { id: 'b2', component_name: 'BMP280', quantity_required: 1 },
  ],
  userStock: [
    { id: 's1', quantity: 3, component: { id: 'c1', name: 'ESP32-C6' } },
  ],
  consumed: [] as Array<{ id: string; stock_id: string; quantity_consumed: number }>,
}

describe('StockConsumption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows progress bar', () => {
    render(<StockConsumption {...baseProps} />)
    expect(screen.getByText(/0 de 2/)).toBeInTheDocument()
  })

  it('available item shows "Usar" button', () => {
    render(<StockConsumption {...baseProps} />)
    expect(screen.getByText('Usar')).toBeInTheDocument()
  })

  it('missing item shows "Falta" badge', () => {
    render(<StockConsumption {...baseProps} />)
    expect(screen.getByText('Falta')).toBeInTheDocument()
  })

  it('consumed item shows "Usado" badge and undo', () => {
    render(
      <StockConsumption
        {...baseProps}
        consumed={[{ id: 'cx', stock_id: 's1', quantity_consumed: 1 }]}
      />,
    )
    expect(screen.getByText('Usado')).toBeInTheDocument()
    expect(screen.getByText(/Deshacer/)).toBeInTheDocument()
  })

  it('consume calls supabase insert and update', async () => {
    render(<StockConsumption {...baseProps} />)
    const usarBtn = screen.getByText('Usar')
    fireEvent.click(usarBtn)

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalled()
      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})
