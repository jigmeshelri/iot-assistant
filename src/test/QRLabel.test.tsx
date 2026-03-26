import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import QRLabel from '../components/islands/QRLabel'

vi.mock('../lib/api', () => ({
  qrImageUrl: (code: string) => `https://api.test/qr/${code}`,
}))

describe('QRLabel', () => {
  it('renders QR code image with correct alt text', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    const img = screen.getByRole('img')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('alt', 'QR de Laboratorio')
  })

  it('shows the QR code text', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    expect(screen.getByText('LOC-ABC-123')).toBeInTheDocument()
  })

  it('renders print button', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    expect(screen.getByText(/Imprimir/)).toBeInTheDocument()
  })

  it('renders the label title', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    expect(screen.getByText('Etiqueta QR')).toBeInTheDocument()
  })

  it('renders QR image with correct src', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src', 'https://api.test/qr/LOC-ABC-123')
  })

  it('handlePrint opens a new window and writes HTML', () => {
    const mockWrite = vi.fn()
    const mockClose = vi.fn()
    const mockOpen = vi.fn().mockReturnValue({
      document: { write: mockWrite, close: mockClose },
    })
    vi.spyOn(window, 'open').mockImplementation(mockOpen)

    render(<QRLabel qrCode="LOC-XYZ-999" locationName="Oficina" />)
    fireEvent.click(screen.getByText(/Imprimir/))

    expect(mockOpen).toHaveBeenCalledWith('', '_blank')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('QR — Oficina'))
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('https://api.test/qr/LOC-XYZ-999'))
    expect(mockClose).toHaveBeenCalled()

    vi.restoreAllMocks()
  })

  it('handlePrint does nothing when window.open returns null', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    // Should not throw
    fireEvent.click(screen.getByText(/Imprimir/))

    vi.restoreAllMocks()
  })
})
