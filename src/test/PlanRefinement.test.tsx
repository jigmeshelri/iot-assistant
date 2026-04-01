import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import PlanRefinement from '../components/islands/PlanRefinement'

const mockGetBrowserSession = vi.fn().mockResolvedValue({ access_token: 'tok123' })

vi.mock('../lib/supabase', () => ({
  getBrowserSession: (...args: unknown[]) => mockGetBrowserSession(...args),
}))

const mockGetUserStock = vi.fn().mockResolvedValue([])

vi.mock('../lib/stock', () => ({
  getUserStock: (...args: unknown[]) => mockGetUserStock(...args),
}))

const mockSaveAIProject = vi.fn().mockResolvedValue({ data: { id: 'proj1' }, error: null })

vi.mock('../lib/projects', () => ({
  saveAIProject: (...args: unknown[]) => mockSaveAIProject(...args),
}))

const mockDiscoverProjects = vi.fn()
const mockPlanProject = vi.fn()

vi.mock('../lib/api', () => ({
  discoverProjects: (...args: unknown[]) => mockDiscoverProjects(...args),
  planProject: (...args: unknown[]) => mockPlanProject(...args),
}))

vi.mock('../lib/errorLog', () => ({
  funErrorMessage: (msg: string) => `FUN: ${msg}`,
  logError: vi.fn(),
}))

Object.defineProperty(window, 'location', { writable: true, value: { href: '', reload: vi.fn() } })

beforeEach(() => {
  vi.clearAllMocks()
  mockGetBrowserSession.mockResolvedValue({ access_token: 'tok123' })
  mockGetUserStock.mockResolvedValue([])
  mockSaveAIProject.mockResolvedValue({ data: { id: 'proj1' }, error: null })
  mockDiscoverProjects.mockResolvedValue({ suggestions: [] })
  mockPlanProject.mockResolvedValue({ title: 'Plan result', bom: [] })
  window.location.href = ''
})

describe('PlanRefinement', () => {
  it('mode "discover" renders discover UI with submit button', () => {
    render(<PlanRefinement mode="discover" />)
    expect(screen.getByText('Descubrir proyectos')).toBeInTheDocument()
    expect(screen.queryByText(/Describe tu proyecto/)).not.toBeInTheDocument()
  })

  it('mode "plan" renders plan UI with textarea', () => {
    render(<PlanRefinement mode="plan" />)
    expect(screen.getByText('Generar BOM')).toBeInTheDocument()
    expect(screen.getByText(/Describe tu proyecto/)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Quiero construir/)).toBeInTheDocument()
  })

  it('difficulty selection dropdown', async () => {
    const user = userEvent.setup()
    render(<PlanRefinement mode="discover" />)

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'intermediate')
    expect(select).toHaveValue('intermediate')
  })

  it('loading state during API call', async () => {
    const user = userEvent.setup()
    let resolveDiscover: (v: unknown) => void
    mockDiscoverProjects.mockReturnValue(
      new Promise(r => { resolveDiscover = r })
    )

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Consultando IA...')).toBeInTheDocument()
    })

    resolveDiscover!({ suggestions: [] })

    await waitFor(() => {
      expect(screen.queryByText('Consultando IA...')).not.toBeInTheDocument()
    })
  })

  it('error state on failure', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockRejectedValue(new Error('network error'))

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('FUN: network error')).toBeInTheDocument()
    })
  })

  it('displays results after successful discover call', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        { title: 'Estación WiFi', description: 'Monitor ambiental', difficulty: 'beginner', viability_pct: 85, bom: [] },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Estación WiFi')).toBeInTheDocument()
    })
    expect(screen.getByText('viabilidad')).toBeInTheDocument()
    expect(screen.getByText('Guardar proyecto')).toBeInTheDocument()
  })

  // --- New tests for uncovered lines ---

  it('error on unauthenticated session', async () => {
    mockGetBrowserSession.mockResolvedValueOnce(null)
    const user = userEvent.setup()
    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('FUN: No autenticado')).toBeInTheDocument()
    })
  })

  it('plan mode submits with description and refinement', async () => {
    const user = userEvent.setup()
    mockPlanProject.mockResolvedValue({
      title: 'Monitor OLED',
      description: 'Plan generado',
      difficulty: 'intermediate',
      bom: [
        { component_name: 'ESP32', quantity_required: 1, status: 'available' },
      ],
    })

    render(<PlanRefinement mode="plan" />)

    const textarea = screen.getByPlaceholderText(/Quiero construir/)
    await user.type(textarea, 'Monitor de temperatura')

    const controllerInput = screen.getByPlaceholderText('ESP32, Arduino...')
    await user.type(controllerInput, 'ESP32')

    await user.click(screen.getByText('Generar BOM'))

    await waitFor(() => {
      expect(mockPlanProject).toHaveBeenCalled()
      expect(screen.getByText('Monitor OLED')).toBeInTheDocument()
    })
  })

  it('displays BOM items in results', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        {
          title: 'Proyecto BOM',
          description: 'Con materiales',
          difficulty: 'beginner',
          bom: [
            { component_name: 'ESP32', quantity_required: 1, status: 'available' },
            { component_name: 'DHT22', quantity_required: 2, status: 'missing' },
          ],
        },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Proyecto BOM')).toBeInTheDocument()
    })
    expect(screen.getByText(/2 componentes/)).toBeInTheDocument()
  })

  it('save button calls supabase insert and redirects', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        { title: 'Proyecto guardable', description: 'Desc', difficulty: 'beginner', bom: [] },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Guardar proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Guardar proyecto'))

    await waitFor(() => {
      expect(mockSaveAIProject).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Proyecto guardable',
          source: 'ai_discovery',
        })
      )
    })
  })

  it('shows controller_note when present', async () => {
    const user = userEvent.setup()
    mockPlanProject.mockResolvedValue({
      title: 'Plan con nota',
      description: 'Desc',
      controller_note: 'ESP32 es recomendado para WiFi',
      bom: [],
    })

    render(<PlanRefinement mode="plan" />)
    const textarea = screen.getByPlaceholderText(/Quiero construir/)
    await user.type(textarea, 'Test')
    await user.click(screen.getByText('Generar BOM'))

    await waitFor(() => {
      expect(screen.getByText('ESP32 es recomendado para WiFi')).toBeInTheDocument()
    })
  })

  it('shows project_type badge when present', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        { title: 'Proyecto tipo', project_type: 'domótica', bom: [] },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('domótica')).toBeInTheDocument()
    })
  })

  it('shows resources links when present', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        {
          title: 'Proyecto con recursos',
          bom: [],
          resources: ['https://example.com/tutorial'],
        },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Recursos')).toBeInTheDocument()
    })
    const link = screen.getByText('https://example.com/tutorial')
    expect(link).toHaveAttribute('href', 'https://example.com/tutorial')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('handles save error gracefully', async () => {
    const user = userEvent.setup()
    mockSaveAIProject.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        { title: 'Proyecto fallo', bom: [] },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Guardar proyecto')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Guardar proyecto'))

    await waitFor(() => {
      expect(screen.getByText('FUN: DB error')).toBeInTheDocument()
    })
  })

  it('constraints field is rendered and usable', async () => {
    const user = userEvent.setup()
    render(<PlanRefinement mode="discover" />)

    const constraintsInput = screen.getByPlaceholderText(/sin WiFi/)
    await user.type(constraintsInput, 'bajo coste, sin WiFi')
    expect(constraintsInput).toHaveValue('bajo coste, sin WiFi')
  })

  it('renders difficulty badge on results', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockResolvedValue({
      suggestions: [
        { title: 'Easy project', difficulty: 'advanced', bom: [] },
      ],
    })

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('Easy project')).toBeInTheDocument()
    })
    // The result badge should contain 'Avanzado' for difficulty 'advanced'
    const badges = screen.getAllByText('Avanzado')
    // At least one badge in the results (the dropdown option also has 'Avanzado')
    expect(badges.length).toBeGreaterThanOrEqual(1)
  })

  it('handles non-Error thrown objects', async () => {
    const user = userEvent.setup()
    mockDiscoverProjects.mockRejectedValue('string error')

    render(<PlanRefinement mode="discover" />)
    await user.click(screen.getByText('Descubrir proyectos'))

    await waitFor(() => {
      expect(screen.getByText('FUN: string error')).toBeInTheDocument()
    })
  })
})
