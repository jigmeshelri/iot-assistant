import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CameraCapture from '../components/islands/CameraCapture'

// Mock supabase
vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'mock-token' } },
      }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: vi.fn(() => ({
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'comp-1' },
            error: null,
          }),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  }),
}))

// Mock recognizeComponent API
vi.mock('../lib/api', () => ({
  recognizeComponent: vi.fn().mockResolvedValue({
    name: 'ESP32-C6 XIAO',
    category: 'Microcontrolador',
    confidence: 0.95,
    platform_family: 'ESP32',
    connectivity_caps: { wifi: true, ble: true },
    technical_specs: {},
    datasheet_url: null,
    notes: null,
  }),
}))

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock')

describe('CameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza la zona de cámara con texto "Fotografiar componente"', () => {
    render(<CameraCapture />)
    expect(screen.getByText('Fotografiar componente')).toBeInTheDocument()
  })

  it('el input acepta archivos de tipo imagen', () => {
    render(<CameraCapture />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.accept).toBe('image/*')
  })

  it('al subir imagen muestra spinner "Reconociendo componente..."', async () => {
    const { recognizeComponent } = await import('../lib/api')
    // Make it slow so spinner is visible
    vi.mocked(recognizeComponent).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve({
        name: 'ESP32-C6 XIAO',
        category: 'Microcontrolador',
        confidence: 0.9,
        platform_family: 'ESP32',
        connectivity_caps: {},
        technical_specs: {},
        datasheet_url: null,
        notes: null,
      }), 100)),
    )

    render(<CameraCapture />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement

    const file = new File(['fake'], 'esp32.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText('Reconociendo componente...')).toBeInTheDocument()
    })
  })

  it('tras reconocimiento muestra banner con nombre del componente', async () => {
    render(<CameraCapture />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['fake'], 'esp32.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)

    await waitFor(() => {
      expect(screen.getByText(/ESP32-C6 XIAO/)).toBeInTheDocument()
      expect(screen.getByText(/Componente identificado/)).toBeInTheDocument()
    })
  })

  it('prefill se pasa al ComponentForm tras reconocimiento', async () => {
    render(<CameraCapture />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    const file = new File(['fake'], 'esp32.jpg', { type: 'image/jpeg' })
    await userEvent.upload(input, file)

    await waitFor(() => {
      // ComponentForm should be pre-filled with recognized data
      const nameInput = screen.getByDisplayValue('ESP32-C6 XIAO')
      expect(nameInput).toBeInTheDocument()
    })
  })
})
