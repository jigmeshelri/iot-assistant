import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ComponentForm from '../components/islands/ComponentForm'

const mockAddComponentToStock = vi.fn().mockResolvedValue({ componentId: 'comp-1', error: null })
const mockLike   = vi.fn().mockResolvedValue({ data: [], error: null })
const mockUpsert = vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'comp-1' }, error: null }) })) }))

vi.mock('../lib/inventory', () => ({
  addComponentToStock: (...args: unknown[]) => mockAddComponentToStock(...args),
}))

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'components') {
        return {
          upsert: mockUpsert,
          select: vi.fn(() => ({ like: mockLike })),
        }
      }
      if (table === 'locations') {
        return {
          select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }
      return {}
    }),
  }),
}))

// Mock sub-components that make their own supabase calls
vi.mock('../components/islands/LocationPicker', () => ({
  default: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <button data-testid="location-picker" onClick={() => onChange('loc-1')}>
      {value ?? 'Sin ubicación'}
    </button>
  ),
}))
vi.mock('../components/islands/ConnectivityEditor', () => ({
  default: () => <div data-testid="connectivity-editor">mock-connectivity</div>,
}))
vi.mock('../components/islands/SpecsEditor', () => ({
  default: () => <div data-testid="specs-editor">mock-specs</div>,
}))

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
})

describe('ComponentForm — renderizado básico', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
    mockAddComponentToStock.mockResolvedValue({ componentId: 'comp-1', error: null })
    mockLike.mockResolvedValue({ data: [], error: null })
  })

  it('renderiza los 6 campos del formulario', () => {
    render(<ComponentForm />)
    expect(screen.getByPlaceholderText(/ESP32-C6 XIAO/i)).toBeInTheDocument() // Nombre
    expect(screen.getByText('Categoría *')).toBeInTheDocument()
    expect(screen.getByText('Plataforma')).toBeInTheDocument()
    expect(screen.getByText('Cantidad *')).toBeInTheDocument()
    expect(screen.getByText('Notas')).toBeInTheDocument()
  })

  it('el campo SKU no es obligatorio (no required)', () => {
    render(<ComponentForm />)
    const skuInput = screen.getByRole('textbox', { name: /código interno/i })
    expect(skuInput).not.toBeRequired()
  })

  it('el label del SKU indica que es auto-generado', () => {
    render(<ComponentForm />)
    expect(screen.getByText(/auto-generado/i)).toBeInTheDocument()
  })
})

describe('ComponentForm — auto-generación de SKU', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLike.mockResolvedValue({ data: [], error: null })
    mockAddComponentToStock.mockResolvedValue({ componentId: 'c1', error: null })
  })

  it('pre-rellena MCU-001 al cargar con categoría Microcontrolador', async () => {
    render(<ComponentForm />)
    // Default category is Microcontrolador, triggers auto-gen on mount
    await waitFor(() => {
      const skuInput = screen.getByRole('textbox', { name: /código interno/i }) as HTMLInputElement
      expect(skuInput.placeholder).toMatch(/MCU-001/i)
    })
  })

  it('muestra aviso cuando el SKU escrito ya existe', async () => {
    mockAddComponentToStock.mockResolvedValueOnce({
      componentId: null,
      error: { type: 'sku_conflict', message: 'duplicate key value violates unique constraint' },
    })
    render(<ComponentForm />)
    await userEvent.type(screen.getByPlaceholderText('ESP32-C6 XIAO'), 'Test')
    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(screen.getByText(/duplicate key/i)).toBeInTheDocument()
    })
  })
})

describe('ComponentForm — prefill y submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLike.mockResolvedValue({ data: [], error: null })
    mockAddComponentToStock.mockResolvedValue({ componentId: 'c1', error: null })
  })

  it('prefill rellena nombre, categoría y plataforma', () => {
    render(
      <ComponentForm prefill={{ name: 'DHT22', category: 'Sensor', platform_family: 'ESP32' }} />,
    )
    expect(screen.getByDisplayValue('DHT22')).toBeInTheDocument()
    expect((screen.getByDisplayValue('Sensor') as HTMLSelectElement).value).toBe('Sensor')
  })

  it('estado success muestra panel verde', async () => {
    render(<ComponentForm />)
    await userEvent.type(screen.getByPlaceholderText('ESP32-C6 XIAO'), 'ESP32')
    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))
    await waitFor(() => {
      expect(screen.getByText('¡Componente añadido!')).toBeInTheDocument()
    })
  })
})

// AC-4.6: Catalog master enrichment via AI scan confirm
describe('ComponentForm — AC-4.6: enriquecimiento del catálogo maestro', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLike.mockResolvedValue({ data: [], error: null })
    mockAddComponentToStock.mockResolvedValue({ componentId: 'catalog-id-123', error: null })
  })

  it('llama a addComponentToStock con name y category correctos (enrichment)', async () => {
    render(
      <ComponentForm
        prefill={{
          name: 'SX1276 LoRa Module',
          category: 'Módulo',
          platform_family: 'ESP32',
        }}
      />,
    )

    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(mockAddComponentToStock).toHaveBeenCalledOnce()
      const [input] = mockAddComponentToStock.mock.calls[0]
      expect(input).toMatchObject({ name: 'SX1276 LoRa Module', category: 'Módulo' })
    })
  })

  it('llama a addComponentToStock con quantity y location_id del estado del formulario', async () => {
    render(
      <ComponentForm
        prefill={{
          name: 'SX1276 LoRa Module',
          category: 'Módulo',
        }}
      />,
    )

    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(mockAddComponentToStock).toHaveBeenCalledOnce()
      const [input] = mockAddComponentToStock.mock.calls[0]
      expect(input).toMatchObject({ quantity: 1, location_id: null })
    })
  })

  it('el input a addComponentToStock incluye sku para evitar duplicados', async () => {
    render(<ComponentForm prefill={{ name: 'ESP32-C6', category: 'Microcontrolador' }} />)

    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(mockAddComponentToStock).toHaveBeenCalledOnce()
      const [input] = mockAddComponentToStock.mock.calls[0]
      expect(input).toHaveProperty('sku')
    })
  })
})
