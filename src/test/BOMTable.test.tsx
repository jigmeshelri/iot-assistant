import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BOMTable from '../components/islands/BOMTable'

const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'new-1' }, error: null })
const mockUpdate = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn().mockResolvedValue({ error: null })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockInsert })) })),
      update: vi.fn(() => ({ eq: mockUpdate })),
      delete: vi.fn(() => ({ eq: mockDelete })),
    })),
  }),
}))

const bomItems = [
  { id: 'b1', component_name: 'ESP32-C6', quantity_required: 1, state: 'available' as const, notes: null, component: { name: 'ESP32-C6' } },
  { id: 'b2', component_name: 'DHT22', quantity_required: 2, state: 'missing' as const, notes: 'Necesario', component: null },
  { id: 'b3', component_name: 'BMP280', quantity_required: 1, state: 'partial' as const, notes: null, component: null },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BOMTable', () => {
  it('read-only mode renders items without edit controls', () => {
    render(<BOMTable items={bomItems} projectId="p1" />)

    expect(screen.getByText('ESP32-C6')).toBeInTheDocument()
    expect(screen.getByText('DHT22')).toBeInTheDocument()
    expect(screen.getByText('BMP280')).toBeInTheDocument()

    const qtyButtons = screen.getAllByRole('button')
    const qtyTexts = qtyButtons.map(b => b.textContent?.trim())
    expect(qtyTexts).toContain('×1')
    expect(qtyTexts).toContain('×2')

    expect(screen.queryByText('+ Añadir componente')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Eliminar')).not.toBeInTheDocument()
  })

  it('editable mode shows add button', () => {
    render(<BOMTable items={bomItems} projectId="p1" editable={true} />)

    expect(screen.getByText('+ Añadir componente')).toBeInTheDocument()
  })

  it('add item flow', async () => {
    const user = userEvent.setup()
    mockInsert.mockResolvedValueOnce({
      data: { id: 'new-1', component_name: 'Resistor 10k', quantity_required: 3 },
      error: null,
    })

    render(<BOMTable items={bomItems} projectId="p1" editable={true} />)

    await user.click(screen.getByText('+ Añadir componente'))

    const nameInput = screen.getByPlaceholderText('Nombre del componente')
    await user.type(nameInput, 'Resistor 10k')

    const qtyInput = screen.getByDisplayValue('1')
    await user.clear(qtyInput)
    await user.type(qtyInput, '3')

    await user.click(screen.getByText('Guardar'))

    expect(mockInsert).toHaveBeenCalled()
    expect(screen.getByText('Resistor 10k')).toBeInTheDocument()
  })

  it('delete item with confirm', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<BOMTable items={bomItems} projectId="p1" editable={true} />)

    const deleteButtons = screen.getAllByLabelText('Eliminar')
    await user.click(deleteButtons[0])

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar este componente del BOM?')
    expect(screen.queryByText('ESP32-C6')).not.toBeInTheDocument()
  })

  it('state badges have correct colors', () => {
    render(<BOMTable items={bomItems} projectId="p1" />)

    const availableBadge = screen.getByText('Disponible')
    expect(availableBadge.className).toContain('text-emerald-700')

    const missingBadge = screen.getByText('Faltante')
    expect(missingBadge.className).toContain('text-red-700')

    const partialBadge = screen.getByText('Parcial')
    expect(partialBadge.className).toContain('text-amber-700')
  })

  it('empty BOM shows add button in editable mode', () => {
    render(<BOMTable items={[]} projectId="p1" editable={true} />)

    expect(screen.getByText('+ Añadir componente')).toBeInTheDocument()
  })
})
