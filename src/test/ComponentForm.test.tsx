import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ComponentForm from '../components/islands/ComponentForm'

const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'comp-1', sku: 'ESP32-001', name: 'ESP32-C6 XIAO' },
  error: null,
})
const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockLike   = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn((table: string) => {
      if (table === 'components') {
        return {
          upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
          select: vi.fn(() => ({ like: mockLike })),
        }
      }
      if (table === 'locations') {
        return {
          select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }
      return { insert: mockInsert }
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
    mockSingle.mockResolvedValue({
      data: { id: 'comp-1', sku: 'ESP32-001', name: 'ESP32-C6 XIAO' },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })
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
    mockSingle.mockResolvedValue({ data: { id: 'c1', sku: 'MCU-001' }, error: null })
    mockInsert.mockResolvedValue({ error: null })
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
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
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
    mockSingle.mockResolvedValue({ data: { id: 'c1', sku: 'MCU-001' }, error: null })
    mockInsert.mockResolvedValue({ error: null })
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
