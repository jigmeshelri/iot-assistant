import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LocationCreateForm from '../components/islands/LocationCreateForm'

const mockInsertLocation = vi.fn()

vi.mock('../lib/locations', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/locations')>()
  return {
    ...real,
    insertLocation: (...args: unknown[]) => mockInsertLocation(...args),
  }
})

describe('LocationCreateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsertLocation.mockResolvedValue({ id: 'new-id', name: 'Bodega', parent_id: null })
  })

  it('renders input and buttons', () => {
    render(<LocationCreateForm onCreated={() => {}} onCancel={() => {}} />)
    expect(screen.getByPlaceholderText('Nombre de ubicación')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear' })).toBeInTheDocument()
  })

  it('calls insertLocation with trimmed name and no parentId for root variant', async () => {
    const user = userEvent.setup()
    render(<LocationCreateForm onCreated={() => {}} onCancel={() => {}} />)

    await user.type(screen.getByPlaceholderText('Nombre de ubicación'), 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(mockInsertLocation).toHaveBeenCalledWith('Bodega', undefined)
  })

  it('calls insertLocation with parentId when provided', async () => {
    const user = userEvent.setup()
    render(<LocationCreateForm parentId="p1" onCreated={() => {}} onCancel={() => {}} />)

    await user.type(screen.getByPlaceholderText('Nombre de ubicación'), 'Estante')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(mockInsertLocation).toHaveBeenCalledWith('Estante', 'p1')
  })

  it('invokes onCreated with the new Location row', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()
    render(<LocationCreateForm onCreated={onCreated} onCancel={() => {}} />)

    await user.type(screen.getByPlaceholderText('Nombre de ubicación'), 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(onCreated).toHaveBeenCalledWith({ id: 'new-id', name: 'Bodega', parent_id: null })
  })

  it('does not submit when name is empty', async () => {
    const user = userEvent.setup()
    render(<LocationCreateForm onCreated={() => {}} onCancel={() => {}} />)
    await user.click(screen.getByRole('button', { name: 'Crear' }))
    expect(mockInsertLocation).not.toHaveBeenCalled()
  })

  it('shows inline error when insertLocation throws', async () => {
    mockInsertLocation.mockRejectedValueOnce(new Error('boom'))
    const user = userEvent.setup()
    const onCreated = vi.fn()
    render(<LocationCreateForm onCreated={onCreated} onCancel={() => {}} />)

    await user.type(screen.getByPlaceholderText('Nombre de ubicación'), 'Bodega')
    await user.click(screen.getByRole('button', { name: 'Crear' }))

    expect(await screen.findByText('No se pudo crear la ubicación')).toBeInTheDocument()
    expect(onCreated).not.toHaveBeenCalled()
  })

  it('calls onCancel when ✕ button clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<LocationCreateForm onCreated={() => {}} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(onCancel).toHaveBeenCalled()
  })
})
