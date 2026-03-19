import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import ComponentForm from '../components/islands/ComponentForm'

// Shared mutable mock — allows per-test overrides
const mockSingle = vi.fn().mockResolvedValue({
  data: { id: 'comp-1', sku: 'ESP32-001', name: 'ESP32-C6 XIAO' },
  error: null,
})
const mockInsert = vi.fn().mockResolvedValue({ error: null })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({ single: mockSingle })),
      })),
      insert: mockInsert,
    })),
  }),
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '' },
})

describe('ComponentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.location.href = ''
    // Restore default success mock
    mockSingle.mockResolvedValue({
      data: { id: 'comp-1', sku: 'ESP32-001', name: 'ESP32-C6 XIAO' },
      error: null,
    })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('renderiza los 6 campos del formulario', () => {
    render(<ComponentForm />)
    expect(screen.getByPlaceholderText('ESP32-001')).toBeInTheDocument()       // SKU
    expect(screen.getByPlaceholderText('ESP32-C6 XIAO')).toBeInTheDocument()  // Nombre
    expect(screen.getByText('Categoría *')).toBeInTheDocument()
    expect(screen.getByText('Plataforma')).toBeInTheDocument()
    expect(screen.getByText('Cantidad *')).toBeInTheDocument()
    expect(screen.getByText('Notas')).toBeInTheDocument()
  })

  it('prefill rellena nombre, categoría y plataforma', () => {
    render(
      <ComponentForm
        prefill={{ name: 'DHT22', category: 'Sensor', platform_family: 'ESP32' }}
      />,
    )
    expect(screen.getByDisplayValue('DHT22')).toBeInTheDocument()
    expect((screen.getByDisplayValue('Sensor') as HTMLSelectElement).value).toBe('Sensor')
    expect((screen.getByDisplayValue('ESP32') as HTMLSelectElement).value).toBe('ESP32')
  })

  it('muestra error de Supabase como texto legible', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'duplicate key value violates unique constraint', code: '23505' },
    })

    render(<ComponentForm />)
    await userEvent.type(screen.getByPlaceholderText('ESP32-001'), 'MCU-001')
    await userEvent.type(screen.getByPlaceholderText('ESP32-C6 XIAO'), 'ESP32')
    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(screen.getByText(/duplicate key/)).toBeInTheDocument()
    })
  })

  it('estado success muestra panel verde', async () => {
    render(<ComponentForm />)
    await userEvent.type(screen.getByPlaceholderText('ESP32-001'), 'MCU-001')
    await userEvent.type(screen.getByPlaceholderText('ESP32-C6 XIAO'), 'ESP32')
    fireEvent.submit(screen.getByRole('button', { name: /Guardar/i }))

    await waitFor(() => {
      expect(screen.getByText('¡Componente añadido!')).toBeInTheDocument()
    })
  })
})
