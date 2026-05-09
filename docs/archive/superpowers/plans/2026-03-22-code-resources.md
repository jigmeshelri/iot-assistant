# Code Resources Versionados — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar `CodeGenerator.tsx` por un panel `CodeResources.tsx` que genera, analiza y persiste código en `project_code_resources` con historial de versiones por archivo.

**Architecture:** Island React con dos modos (Generar / Analizar). Generar llama a `/ai/code/generate` existente y persiste en Supabase. Analizar llama al nuevo endpoint `/ai/code/analyze` y también persiste. La lista muestra versiones agrupadas por filename. La tabla `project_code_resources` se extiende con columnas `version` y `parent_id` vía migración.

**Tech Stack:** React 19, TypeScript, Supabase JS v2, FastAPI + Anthropic SDK, Vitest + Testing Library, Astro 6.

**Spec:** `docs/superpowers/specs/2026-03-22-code-resources-sku-design.md` — Bloque 1

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `supabase/migrations/20260322_code_resources_versioning.sql` | Crear | ALTER TABLE: añade `version`, `parent_id`, índice, constraint UNIQUE |
| `src/lib/codeResources.ts` | Crear | Tipo `SavedCodeResource`, utilidad `localMaxVersion` |
| `src/lib/api.ts` | Modificar | Añade `analyzeCode()` y `CodeAnalyzeResponse` |
| `api/main.py` | Modificar | Añade modelos y endpoint `POST /ai/code/analyze` |
| `src/components/islands/CodeResources.tsx` | Crear | Island completo: tabs Generar/Analizar + lista versionada |
| `src/components/islands/CodeGenerator.tsx` | Eliminar | Reemplazado por CodeResources |
| `src/pages/projects/[id].astro` | Modificar | Reemplaza CodeGenerator por CodeResources, carga `initialResources` |
| `src/test/CodeResources.test.tsx` | Crear | Tests de Vitest para todos los modos y casos de error |

---

## Task 1: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260322_code_resources_versioning.sql`

- [ ] **Escribir el archivo de migración**

```sql
-- supabase/migrations/20260322_code_resources_versioning.sql
-- DEFAULT 1 hace backfill automático de todas las filas existentes en PostgreSQL.

ALTER TABLE project_code_resources
  ADD COLUMN IF NOT EXISTS version   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES project_code_resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_code_resources_filename
  ON project_code_resources(project_id, filename);

ALTER TABLE project_code_resources
  DROP CONSTRAINT IF EXISTS uq_resource_version;

ALTER TABLE project_code_resources
  ADD CONSTRAINT uq_resource_version UNIQUE (project_id, filename, version);
```

- [ ] **Aplicar la migración** usando el MCP de Supabase:

  Herramienta: `mcp__supabase__apply_migration` con el SQL anterior.
  Confirmar antes de ejecutar porque afecta producción.

- [ ] **Verificar con SQL** que las columnas existen:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'project_code_resources'
  AND column_name IN ('version', 'parent_id');
```

  Esperado: dos filas — `version INTEGER DEFAULT 1`, `parent_id uuid`.

- [ ] **Commit**

```bash
git add supabase/migrations/20260322_code_resources_versioning.sql
git commit -m "feat(db): add version and parent_id to project_code_resources"
```

---

## Task 2: Tipos y utilidad `localMaxVersion`

**Files:**
- Create: `src/lib/codeResources.ts`
- Create: `src/test/codeResources.test.ts`

- [ ] **Escribir el test primero**

```typescript
// src/test/codeResources.test.ts
import { describe, it, expect } from 'vitest'
import { localMaxVersion } from '../lib/codeResources'
import type { SavedCodeResource } from '../lib/codeResources'

function makeResource(filename: string, version: number): SavedCodeResource {
  return {
    id: `id-${version}`, project_id: 'p1', filename,
    language: 'cpp', environment: 'arduino', content: 'x',
    version, parent_id: null, is_generated: true,
    created_at: new Date().toISOString(),
  }
}

describe('localMaxVersion', () => {
  it('returns 0 when no resources', () => {
    expect(localMaxVersion([], 'main.ino')).toBe(0)
  })

  it('returns 0 when filename not found', () => {
    expect(localMaxVersion([makeResource('other.ino', 3)], 'main.ino')).toBe(0)
  })

  it('returns max version for filename', () => {
    const resources = [
      makeResource('main.ino', 1),
      makeResource('main.ino', 3),
      makeResource('main.ino', 2),
      makeResource('sensor.cpp', 5),
    ]
    expect(localMaxVersion(resources, 'main.ino')).toBe(3)
  })
})
```

- [ ] **Ejecutar el test y verificar que falla**

```bash
cd iot-assistant && npx vitest run src/test/codeResources.test.ts
```

  Esperado: FAIL — `Cannot find module '../lib/codeResources'`

- [ ] **Implementar `src/lib/codeResources.ts`**

```typescript
export interface SavedCodeResource {
  id:           string
  project_id:   string
  filename:     string
  language:     string
  environment:  string | null
  content:      string
  version:      number
  parent_id:    string | null
  is_generated: boolean
  created_at:   string
}

/**
 * Máxima versión de un filename en estado local.
 * SOLO usar para display. Para INSERTs, consultar MAX(version) desde Supabase.
 */
export function localMaxVersion(resources: SavedCodeResource[], filename: string): number {
  return resources
    .filter(r => r.filename === filename)
    .reduce((max, r) => Math.max(max, r.version), 0)
}
```

- [ ] **Ejecutar el test y verificar que pasa**

```bash
cd iot-assistant && npx vitest run src/test/codeResources.test.ts
```

  Esperado: PASS — 3 tests pasando.

- [ ] **Commit**

```bash
git add src/lib/codeResources.ts src/test/codeResources.test.ts
git commit -m "feat(lib): add SavedCodeResource type and localMaxVersion utility"
```

---

## Task 3: Agregar `analyzeCode` al cliente API

**Files:**
- Modify: `src/lib/api.ts`

- [ ] **Agregar al final de `src/lib/api.ts`**

```typescript
export interface CodeAnalyzeResponse {
  explanation:   string
  improved_code: string
}

export async function analyzeCode(
  payload: {
    code:          string
    language:      string
    environment?:  string
    mode:          'review' | 'optimize' | 'refactor'
    project_type:  string
  },
  token: string,
): Promise<CodeAnalyzeResponse> {
  return apiFetch('/ai/code/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}
```

- [ ] **Verificar que TypeScript compila sin errores**

```bash
cd iot-assistant && npx tsc --noEmit
```

  Esperado: sin output (0 errores).

- [ ] **Commit**

```bash
git add iot-assistant/src/lib/api.ts
git commit -m "feat(api): add analyzeCode client function"
```

---

## Task 4: Endpoint FastAPI `/ai/code/analyze`

**Files:**
- Modify: `api/main.py` — añadir modelos y endpoint después de `generate_code`

- [ ] **Añadir los modelos Pydantic** (después de `CodeGenerateResponse`, línea ~170):

```python
class AnalyzeMode(str, Enum):
    review   = "review"
    optimize = "optimize"
    refactor = "refactor"


class CodeAnalyzeRequest(BaseModel):
    code:         str
    language:     str
    environment:  str | None = None
    mode:         AnalyzeMode
    project_type: str  # diy | prototype | professional


class CodeAnalyzeResponse(BaseModel):
    explanation:   str
    improved_code: str
```

  **Importante:** `from enum import Enum` NO está importado en `api/main.py`. Verificar y añadir:

  ```bash
  cd iot-assistant && grep -n "from enum import Enum" api/main.py
  ```

  Si el comando no devuelve output, añadir la línea al bloque de imports estándar al inicio del archivo (junto a `from typing import ...` o `import json`):

  ```python
  from enum import Enum
  ```

  **Nota:** `_extract_json` es un helper ya existente en `api/main.py` (alrededor de la línea 176). No es necesario definirlo — el endpoint puede usarlo directamente.

- [ ] **Añadir el endpoint** (después de `generate_code`, antes de `/qr`):

```python
_ANALYZE_PROMPTS: dict[str, dict[str, str]] = {
    "review": {
        "diy":          "Review this code for obvious bugs and incorrect API usage. Keep feedback simple.",
        "prototype":    "Review for bugs, race conditions, and memory leaks. Be thorough.",
        "professional": "Perform a rigorous review: const correctness, robust error handling, thread safety, and RTOS considerations.",
    },
    "optimize": {
        "diy":          "Suggest simple code simplifications that improve readability.",
        "prototype":    "Optimize memory and CPU usage. Reduce binary size where possible.",
        "professional": "Optimize aggressively: analyze stack depth, heap fragmentation, energy consumption in sleep modes.",
    },
    "refactor": {
        "diy":          "Improve readability and variable naming. Keep it simple.",
        "prototype":    "Separate configuration from logic. Keep functions short and focused.",
        "professional": "Apply environment patterns (ESP-IDF components, Zephyr modules). Enforce single-responsibility.",
    },
}


@app.post("/ai/code/analyze", response_model=CodeAnalyzeResponse, tags=["ai"])
async def analyze_code(
    req: CodeAnalyzeRequest,
    _claims: dict = Depends(verify_jwt),
) -> CodeAnalyzeResponse:
    """Analiza y mejora código existente según el modo y tipo de proyecto."""
    client = _anthropic_client()

    project_type = req.project_type if req.project_type in ("diy", "prototype", "professional") else "prototype"
    system_instruction = _ANALYZE_PROMPTS[req.mode][project_type]
    env_hint = f" Target environment: {req.environment}." if req.environment else ""

    prompt = (
        f"{system_instruction}{env_hint}\n\n"
        f"Language: {req.language}\n\n"
        f"Code to analyze:\n```\n{req.code}\n```\n\n"
        "Respond ONLY with valid JSON (no markdown fences):\n"
        '{"explanation":"...markdown with numbered improvements...","improved_code":"...full improved code..."}'
    )

    message = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        data = json.loads(_extract_json(message.content[0].text))
        return CodeAnalyzeResponse(
            explanation=data["explanation"],
            improved_code=data["improved_code"],
        )
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=422, detail=f"AI response parse error: {exc}") from exc
```

- [ ] **Verificar que el servidor arranca sin errores**

```bash
cd api && python -c "import main; print('OK')"
```

  Esperado: `OK` sin excepciones.

- [ ] **Verificar el endpoint en Swagger** (si el servidor está corriendo):

  GET `http://localhost:8000/docs` → verificar que aparece `POST /ai/code/analyze`.

- [ ] **Commit**

```bash
git add api/main.py
git commit -m "feat(api): add POST /ai/code/analyze endpoint with 3 modes x 3 project types"
```

---

## Task 5: `CodeResources.tsx` — modo Generar + lista básica

**Files:**
- Create: `src/test/CodeResources.test.tsx`
- Create: `src/components/islands/CodeResources.tsx`

- [ ] **Escribir los tests del modo Generar**

```typescript
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

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    from: vi.fn((table: string) => {
      if (table === 'project_code_resources') {
        return {
          insert: vi.fn(() => ({ select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'res-1', filename: 'main.ino', language: 'cpp', environment: 'arduino', content: '// code', version: 1, parent_id: null, is_generated: true, created_at: new Date().toISOString() }, error: null }) }) })) }),
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
    expect(screen.getByRole('button', { name: /Generar/i })).toBeInTheDocument()
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
```

- [ ] **Ejecutar tests — verificar que fallan**

```bash
cd iot-assistant && npx vitest run src/test/CodeResources.test.tsx
```

  Esperado: FAIL — `Cannot find module '../components/islands/CodeResources'`

- [ ] **Implementar `CodeResources.tsx`**

  Crear `src/components/islands/CodeResources.tsx` con:

```typescript
import { useState } from 'react'
import { createSupabaseBrowserClient } from '../../lib/supabase'
import { generateCode, analyzeCode } from '../../lib/api'
import type { SavedCodeResource } from '../../lib/codeResources'
import { localMaxVersion } from '../../lib/codeResources'

const ENVIRONMENTS = ['arduino','platformio','esp-idf','zephyr','rust','esphome','micropython'] as const
const ANALYZE_MODES = [
  { value: 'review',   label: 'Revisar bugs' },
  { value: 'optimize', label: 'Optimizar' },
  { value: 'refactor', label: 'Refactorizar' },
] as const

interface Props {
  projectId:        string
  projectTitle:     string
  projectType:      string
  bom:              { component_name: string; quantity_required: number }[]
  initialResources: SavedCodeResource[]
}

type View          = 'generate' | 'analyze'
type AnalyzeSource = 'existing' | 'paste'

export default function CodeResources({ projectId, projectTitle, projectType, bom, initialResources }: Props) {
  const [view, setView]               = useState<View>('generate')
  const [resources, setResources]     = useState<SavedCodeResource[]>(initialResources)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [explanation, setExplanation] = useState('')

  // Generate mode state
  const [env, setEnv]   = useState('arduino')
  const [mode, setMode] = useState('skeleton')

  // Analyze mode state
  const [analyzeSource, setAnalyzeSource]     = useState<AnalyzeSource>('existing')
  const [analyzeMode, setAnalyzeMode]         = useState<'review'|'optimize'|'refactor'>('review')
  const [selectedResourceId, setSelectedResourceId] = useState('')
  const [pasteCode, setPasteCode]             = useState('')
  const [pasteLang, setPasteLang]             = useState('cpp')
  const [pasteEnv, setPasteEnv]               = useState('arduino')
  const [pasteFilename, setPasteFilename]     = useState('')

  // Delete confirmation state: resourceId → 'pending' | undefined
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Version viewer: filename → version number to display
  const [viewingVersion, setViewingVersion] = useState<Record<string, number>>({})

  function friendlyError(msg: string): string {
    if (msg.includes('503')) return 'La IA se encuentra en la oficina sin teléfono, por favor intenta más tarde'
    if (msg.includes('422')) return 'La IA y yo no nos estamos entendiendo, intenta más tarde'
    return msg
  }

  async function getSupabaseToken(): Promise<string> {
    const supabase = createSupabaseBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    return session.access_token
  }

  async function fetchMaxVersion(filename: string): Promise<number> {
    const supabase = createSupabaseBrowserClient()
    const { data } = await supabase
      .from('project_code_resources')
      .select('version')
      .eq('project_id', projectId)
      .eq('filename', filename)
    if (!data || data.length === 0) return 0
    return Math.max(...data.map((r: { version: number }) => r.version))
  }

  async function saveResource(
    opts: { filename: string; language: string; environment: string | null; content: string; isGenerated: boolean; parentId: string | null }
  ): Promise<SavedCodeResource> {
    const supabase = createSupabaseBrowserClient()
    let version = (await fetchMaxVersion(opts.filename)) + 1
    let attempt = 0
    while (attempt < 3) {
      const { data, error: err } = await supabase
        .from('project_code_resources')
        .insert({
          project_id: projectId,
          filename: opts.filename,
          language: opts.language,
          environment: opts.environment,
          content: opts.content,
          version,
          parent_id: opts.parentId,
          is_generated: opts.isGenerated,
        })
        .select()
        .single()
      if (!err && data) return data as SavedCodeResource
      if (err?.code === '23505') { version++; attempt++; continue }
      throw new Error(err?.message ?? 'Error guardando recurso')
    }
    throw new Error('Conflicto de versión — demasiados reintentos')
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setExplanation('')
    try {
      const token = await getSupabaseToken()
      const result = await generateCode({ project_type: projectType, environment: env, bom, project_title: projectTitle, mode }, token)
      const newResources: SavedCodeResource[] = []
      // Nota sobre parent_id: se deriva del estado local para trazabilidad de linaje.
      // Los números de versión se leen de Supabase (fetchMaxVersion) → siempre son correctos.
      // Si otro cliente añadió versiones desde que se cargó la página, parent_id puede apuntar
      // a una versión intermedia que no es la última en DB, pero esto es aceptable.
      for (const r of result.resources) {
        const currentMax = localMaxVersion(resources, r.filename)
        const parentId = currentMax > 0
          ? (resources.find(x => x.filename === r.filename && x.version === currentMax)?.id ?? null)
          : null
        const saved = await saveResource({ filename: r.filename, language: r.language, environment: env, content: r.content, isGenerated: true, parentId })
        newResources.push(saved)
      }
      setResources(prev => {
        const updated = [...prev]
        for (const r of newResources) {
          const idx = updated.findIndex(x => x.filename === r.filename && x.version === r.version)
          if (idx >= 0) updated[idx] = r; else updated.push(r)
        }
        return updated
      })
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setExplanation('')
    try {
      const token = await getSupabaseToken()
      let code = '', language = 'cpp', environment: string | null = null, filename = '', sourceId: string | null = null
      if (analyzeSource === 'existing' && selectedResourceId) {
        const src = resources.find(r => r.id === selectedResourceId)
        if (!src) throw new Error('Recurso no encontrado')
        code = src.content; language = src.language; environment = src.environment; filename = src.filename; sourceId = src.id
      } else {
        if (!pasteCode.trim()) throw new Error('El código no puede estar vacío')
        code = pasteCode; language = pasteLang; environment = pasteEnv || null; filename = pasteFilename || `code.${pasteLang}`
      }
      const result = await analyzeCode({ code, language, environment: environment ?? undefined, mode: analyzeMode, project_type: projectType }, token)
      setExplanation(result.explanation)
      const saved = await saveResource({ filename, language, environment, content: result.improved_code, isGenerated: false, parentId: sourceId })
      setResources(prev => [...prev, saved])
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : 'Error desconocido'))
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(resource: SavedCodeResource) {
    const supabase = createSupabaseBrowserClient()
    // Optimistic update
    setResources(prev => prev.filter(r => r.id !== resource.id))
    setDeleteConfirm(null)
    const { error: err } = await supabase
      .from('project_code_resources')
      .delete()
      .eq('id', resource.id)
      .eq('project_id', projectId)
    if (err) {
      // Revert
      setResources(prev => [...prev, resource].sort((a, b) => a.version - b.version))
      setError(`No se pudo eliminar ${resource.filename} v${resource.version}`)
    }
  }

  function handleDownload(resource: SavedCodeResource) {
    const blob = new Blob([resource.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = resource.filename; a.click()
    URL.revokeObjectURL(url)
  }

  // Group resources by filename, sorted by version desc
  const grouped = Object.entries(
    resources.reduce<Record<string, SavedCodeResource[]>>((acc, r) => {
      if (!acc[r.filename]) acc[r.filename] = []
      acc[r.filename].push(r)
      return acc
    }, {})
  ).map(([filename, versions]) => ({
    filename,
    versions: versions.sort((a, b) => b.version - a.version),
  }))

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['generate', 'analyze'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setError(''); setExplanation('') }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {v === 'generate' ? 'Generar' : 'Analizar'}
          </button>
        ))}
      </div>

      {/* Generate panel */}
      {view === 'generate' && (
        <form onSubmit={handleGenerate} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <select value={env} onChange={e => setEnv(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={mode} onChange={e => setMode(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="skeleton">Esqueleto (TODOs)</option>
              <option value="complete">Completo</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generando...</>
              : '✨ Generar código'}
          </button>
        </form>
      )}

      {/* Analyze panel */}
      {view === 'analyze' && (
        <form onSubmit={handleAnalyze} className="space-y-3">
          {/* Source toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['existing', 'paste'] as AnalyzeSource[]).map(s => (
              <button key={s} type="button"
                onClick={() => setAnalyzeSource(s)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${analyzeSource === s ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                {s === 'existing' ? 'Recurso existente' : 'Pegar código'}
              </button>
            ))}
          </div>

          {analyzeSource === 'existing' ? (
            <select value={selectedResourceId} onChange={e => setSelectedResourceId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
              <option value="">— Selecciona un archivo —</option>
              {grouped.flatMap(({ versions }) =>
                versions.map(r => (
                  <option key={r.id} value={r.id}>{r.filename} v{r.version}</option>
                ))
              )}
            </select>
          ) : (
            <div className="space-y-2">
              <input value={pasteFilename} onChange={e => setPasteFilename(e.target.value)}
                placeholder="nombre-archivo.cpp"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-teal-400" />
              <div className="grid grid-cols-2 gap-2">
                <input value={pasteLang} onChange={e => setPasteLang(e.target.value)} placeholder="cpp"
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400" />
                <select value={pasteEnv} onChange={e => setPasteEnv(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-400">
                  {ENVIRONMENTS.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <textarea value={pasteCode} onChange={e => setPasteCode(e.target.value)}
                placeholder="Pega tu código aquí..." rows={6}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-teal-400" />
            </div>
          )}

          {/* Analyze mode buttons */}
          <div className="flex gap-2">
            {ANALYZE_MODES.map(m => (
              <button key={m.value} type="button"
                onClick={() => setAnalyzeMode(m.value as typeof analyzeMode)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${analyzeMode === m.value ? 'bg-teal-500 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-teal-500 text-white rounded-xl text-sm font-medium hover:bg-teal-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando...</>
              : '🔍 Analizar código'}
          </button>
        </form>
      )}

      {/* Explanation panel */}
      {explanation && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800">Resultado del análisis</span>
            <button onClick={() => setExplanation('')} className="text-xs text-amber-600 hover:text-amber-800">✕</button>
          </div>
          <div className="text-xs text-amber-900 whitespace-pre-wrap">{explanation}</div>
        </div>
      )}

      {/* Resource list */}
      {grouped.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recursos guardados</h3>
          {grouped.map(({ filename, versions }) => {
            const activeVersion = viewingVersion[filename] ?? versions[0].version
            const activeResource = versions.find(v => v.version === activeVersion) ?? versions[0]
            const prevCount = versions.length - 1
            return (
              <div key={filename} className="bg-white border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-sm font-mono font-medium text-slate-800 truncate block">{filename}</span>
                    <span className="text-xs text-slate-400">{activeResource.language} · {activeResource.environment ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Version picker */}
                    <select
                      value={activeVersion}
                      onChange={e => setViewingVersion(prev => ({ ...prev, [filename]: +e.target.value }))}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    >
                      {versions.map(v => (
                        <option key={v.id} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                    {/* Download */}
                    <button onClick={() => handleDownload(activeResource)} title="Descargar"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
                      <svg className="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    {/* Delete */}
                    {deleteConfirm === activeResource.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(activeResource)}
                          className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600">Confirmar</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="text-xs px-2 py-1 border border-slate-200 rounded-lg text-slate-500">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(activeResource.id)} title="Eliminar"
                        aria-label="eliminar"
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-100 flex items-center justify-center transition-colors">
                        <svg className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                {prevCount > 0 && (
                  <p className="text-xs text-slate-400">{prevCount} versión{prevCount > 1 ? 'es' : ''} anterior{prevCount > 1 ? 'es' : ''}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Ejecutar tests y verificar que pasan**

```bash
cd iot-assistant && npx vitest run src/test/CodeResources.test.tsx
```

  Esperado: todos los tests PASS.

- [ ] **Commit**

```bash
git add iot-assistant/src/components/islands/CodeResources.tsx iot-assistant/src/test/CodeResources.test.tsx
git commit -m "feat(islands): add CodeResources with generate/analyze modes and versioned list"
```

---

## Task 6: Wiring en `projects/[id].astro`

**Files:**
- Modify: `src/pages/projects/[id].astro`
- Delete: `src/components/islands/CodeGenerator.tsx`

- [ ] **Actualizar el import y añadir carga de `initialResources`** en `projects/[id].astro`

  Reemplazar:
  ```astro
  import CodeGenerator from '../../components/islands/CodeGenerator'
  ```
  Por:
  ```astro
  import CodeResources from '../../components/islands/CodeResources'
  ```

  Añadir después de `const { data: logs } = ...`:
  ```typescript
  const { data: codeResources } = await supabase
    .from('project_code_resources')
    .select('*')
    .eq('project_id', id!)
    .order('filename')
    .order('version', { ascending: false })
  ```

- [ ] **Reemplazar `<CodeGenerator .../>` por `<CodeResources .../>` en ambos slots** (mobile y desktop-main):

  ```astro
  <CodeResources
    projectId={id!}
    projectTitle={project.title}
    projectType={project.project_type}
    bom={bom?.map(b => ({ component_name: b.component?.name ?? '', quantity_required: b.quantity_required })) ?? []}
    initialResources={codeResources ?? []}
    client:load
  />
  ```

- [ ] **Eliminar `CodeGenerator.tsx`**

```bash
rm iot-assistant/src/components/islands/CodeGenerator.tsx
```

- [ ] **Verificar que el build no tiene errores TypeScript**

```bash
cd iot-assistant && npx tsc --noEmit
```

  Esperado: sin output.

- [ ] **Ejecutar todos los tests**

```bash
cd iot-assistant && npm test
```

  Esperado: todos los tests PASS (CodeResources + tests anteriores).

- [ ] **Commit final**

```bash
git add iot-assistant/src/pages/projects/\[id\].astro
git rm iot-assistant/src/components/islands/CodeGenerator.tsx
git commit -m "feat: wire CodeResources into project page, remove CodeGenerator"
```

---

## Verificación final

- [ ] Iniciar servidor de desarrollo y verificar en **móvil** (≤ 768px) y **escritorio** (≥ 1024px):
  - La sección "Recursos guardados" aparece en ambos layouts
  - Generar código crea una tarjeta con `v1`
  - Regenerar el mismo archivo crea `v2` con "1 versión anterior"
  - Analizar crea una versión nueva con el filename original
  - Descargar no hace llamada al servidor
  - Eliminar pide confirmación y desaparece de la lista

- [ ] Si hay errores de layout en escritorio, revisar que ambos slots (`default` con `lg:hidden` y `desktop-main`) tengan `<CodeResources ... client:load />`
