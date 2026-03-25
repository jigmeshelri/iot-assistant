import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import InventoryDetail from '../components/islands/InventoryDetail'

const mockEq = vi.fn().mockResolvedValue({ error: null })
const mockUpdate = vi.fn(() => ({ eq: mockEq }))
const mockDeleteEq = vi.fn().mockResolvedValue({ error: null })
const mockDelete = vi.fn(() => ({ eq: mockDeleteEq }))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn((table: string) => ({
      update: table === 'components' || table === 'stock' ? mockUpdate : vi.fn(),
      delete: table === 'stock' ? mockDelete : vi.fn(),
    })),
  }),
}))

vi.mock('../components/islands/ConnectivityEditor', () => ({
  default: () => <div data-testid="conn-editor" />,
}))
vi.mock('../components/islands/SpecsEditor', () => ({
  default: () => <div data-testid="specs-editor" />,
}))
vi.mock('../components/islands/LocationPicker', () => ({
  default: () => <div data-testid="loc-picker" />,
}))

const originalLocation = window.location

beforeEach(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '', reload: vi.fn() },
  })
})

afterAll(() => {
  Object.defineProperty(window, 'location', {
    writable: true,
    value: originalLocation,
  })
})

const defaultProps = {
  stockId: 'stock-1',
  componentId: 'comp-1',
  name: 'ESP32-C6 XIAO',
  sku: 'MCU-001',
  category: 'Microcontrolador',
  platformFamily: 'ESP32',
  imageUrl: null,
  connectivityCaps: { wifi: true, ble: true },
  technicalSpecs: { voltaje: '3.3V', interfaz: 'USB-C' },
  datasheetUrl: 'https://example.com/datasheet.pdf',
  quantity: 3,
  notes: 'Test notes',
  locationId: 'loc-1',
  locationName: 'Maletín Azul',
  locationQrCode: 'qr-abc123',
}

describe('InventoryDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
  })

  it('view mode renders component info', () => {
    render(<InventoryDetail {...defaultProps} />)
    expect(screen.getByText('MCU-001')).toBeInTheDocument()
    expect(screen.getByText('Microcontrolador')).toBeInTheDocument()
    expect(screen.getByText('ESP32')).toBeInTheDocument()
  })

  it('view mode shows connectivity badges', () => {
    render(<InventoryDetail {...defaultProps} />)
    expect(screen.getByText('wifi')).toBeInTheDocument()
    expect(screen.getByText('ble')).toBeInTheDocument()
  })

  it('view mode shows technical specs', () => {
    render(<InventoryDetail {...defaultProps} />)
    expect(screen.getByText('voltaje')).toBeInTheDocument()
    expect(screen.getByText('3.3V')).toBeInTheDocument()
    expect(screen.getByText('interfaz')).toBeInTheDocument()
    expect(screen.getByText('USB-C')).toBeInTheDocument()
  })

  it('edit button toggles to edit mode', () => {
    render(<InventoryDetail {...defaultProps} />)
    fireEvent.click(screen.getByText('Editar componente'))
    expect(screen.getByText('Editar componente', { selector: 'h3' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('ESP32-C6 XIAO')).toBeInTheDocument()
  })

  it('cancel returns to view mode', () => {
    render(<InventoryDetail {...defaultProps} />)
    fireEvent.click(screen.getByText('Editar componente'))
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(screen.getByText('Editar componente', { selector: 'button' })).toBeInTheDocument()
  })

  it('delete calls supabase and redirects', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<InventoryDetail {...defaultProps} />)
    fireEvent.click(screen.getByText('Eliminar del inventario'))
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled()
      expect(mockDeleteEq).toHaveBeenCalledWith('id', 'stock-1')
      expect(window.location.href).toBe('/inventory')
    })
  })

  it('shows datasheet link', () => {
    render(<InventoryDetail {...defaultProps} />)
    expect(screen.getByText('Datasheet')).toBeInTheDocument()
    expect(screen.getByText('https://example.com/datasheet.pdf')).toBeInTheDocument()
  })
})
