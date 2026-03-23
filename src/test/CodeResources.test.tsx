// src/test/CodeResources.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import CodeResources from '../components/islands/CodeResources'

const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'res-1', version: 1 }, error: null })
const mockDelete = vi.fn().mockResolvedValue({ error: null })

// fetchMaxVersion llama .from().select('version').eq().eq() → debe retornar array
// para que data.map() funcione. Retornar [] (sin versiones previas) es el caso base.
const mockFetchVersions = vi.fn().mockResolvedValue({ data: [], error: null })

const mockSavedResource = {
  id: 'res-1', filename: 'main.ino', language: 'cpp', environment: 'arduino',
  content: '// code', version: 1, parent_id: null, is_generated: true, created_at: new Date().toISOString(),
}

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    from: vi.fn((table: string) => {
      if (table === 'project_code_resources') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: mockSavedResource, error: null }),
            })),
          })),
          select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: mockFetchVersions })) })),
          delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
        }
      }
      return {}
    }),
  }),
}))

vi.mock('../lib/api', () => ({
  generateCode: vi.fn().mockResolvedValue({
    resources: [{ filename: 'main.ino', language: 'cpp', content: '// generated', explanation: 'Basic sketch', dependencies: [] }],
  }),
  analyzeCode: vi.fn().mockResolvedValue({
    explanation: '## Mejoras\n1. Fix the bug',
    improved_code: '// improved',
  }),
}))

const defaultProps = {
  projectId: 'proj-1',
  projectTitle: 'Test Project',
  projectType: 'diy',
  bom: [{ component_name: 'ESP32', quantity_required: 1 }],
  initialResources: [],
}

describe('CodeResources — Modo Generar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('muestra el tab Generar activo por defecto', () => {
    render(<CodeResources {...defaultProps} />)
    expect(screen.getAllByRole('button', { name: /Generar/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Analizar/i })).toBeInTheDocument()
  })

  it('muestra selector de entorno y modo', () => {
    render(<CodeResources {...defaultProps} />)
    expect(screen.getByDisplayValue('arduino')).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Esqueleto/i)).toBeInTheDocument()
  })

  it('llama a generateCode y muestra el recurso en la lista', async () => {
    render(<CodeResources {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /✨ Generar/i }))
    await waitFor(() => {
      expect(screen.getByText('main.ino')).toBeInTheDocument()
    })
  })
})

describe('CodeResources — Errores', () => {
  it('muestra mensaje divertido en error 503', async () => {
    const { generateCode } = await import('../lib/api')
    vi.mocked(generateCode).mockRejectedValueOnce(new Error('API 503: error'))
    render(<CodeResources {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /✨ Generar/i }))
    await waitFor(() => {
      expect(screen.getByText(/oficina sin teléfono/i)).toBeInTheDocument()
    })
  })
})

describe('CodeResources — Lista y versiones', () => {
  it('muestra recursos iniciales con versión', () => {
    const resources = [{
      id: 'r1', project_id: 'proj-1', filename: 'main.ino',
      language: 'cpp', environment: 'arduino', content: '// v1',
      version: 1, parent_id: null, is_generated: true,
      created_at: new Date().toISOString(),
    }]
    render(<CodeResources {...defaultProps} initialResources={resources} />)
    expect(screen.getByText('main.ino')).toBeInTheDocument()
    expect(screen.getByText('v1')).toBeInTheDocument()
  })

  it('muestra botón de eliminar y pide confirmación', async () => {
    const resources = [{
      id: 'r1', project_id: 'proj-1', filename: 'main.ino',
      language: 'cpp', environment: 'arduino', content: '// v1',
      version: 1, parent_id: null, is_generated: true,
      created_at: new Date().toISOString(),
    }]
    render(<CodeResources {...defaultProps} initialResources={resources} />)
    fireEvent.click(screen.getByRole('button', { name: /eliminar/i }))
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
  })
})
