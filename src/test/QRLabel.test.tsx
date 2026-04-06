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

  it('renders a hidden iframe for printing', () => {
    render(<QRLabel qrCode="LOC-ABC-123" locationName="Laboratorio" />)
    const iframe = document.querySelector('iframe[title="print"]')
    expect(iframe).toBeInTheDocument()
    expect(iframe).toHaveClass('hidden')
  })

  it('handlePrint writes QR image to iframe document', () => {
    render(<QRLabel qrCode="LOC-XYZ-999" locationName="Oficina" />)
    const iframe = document.querySelector('iframe[title="print"]') as HTMLIFrameElement

    // Mock iframe contentDocument
    const mockWrite = vi.fn()
    const mockClose = vi.fn()
    const mockImg = { complete: true, onload: null }
    const mockQuerySelector = vi.fn().mockReturnValue(mockImg)
    const mockFocus = vi.fn()
    const mockPrint = vi.fn()

    Object.defineProperty(iframe, 'contentDocument', {
      value: { open: vi.fn(), write: mockWrite, close: mockClose, querySelector: mockQuerySelector },
      configurable: true,
    })
    Object.defineProperty(iframe, 'contentWindow', {
      value: { focus: mockFocus, print: mockPrint },
      configurable: true,
    })

    fireEvent.click(screen.getByText(/Imprimir/))

    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('QR — Oficina'))
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('https://api.test/qr/LOC-XYZ-999'))
    expect(mockClose).toHaveBeenCalled()
    expect(mockFocus).toHaveBeenCalled()
    expect(mockPrint).toHaveBeenCalled()
  })
})
