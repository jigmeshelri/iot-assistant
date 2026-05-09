# SKU Auto-generado — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el campo SKU de `ComponentForm` en opcional con auto-generación por categoría, eliminando la fricción de alta de componentes.

**Architecture:** La función `nextAvailableSku` en `src/lib/skuUtils.ts` consulta Supabase para encontrar el primer número libre por prefijo de categoría. `ComponentForm.tsx` la llama al cambiar de categoría y pre-rellena el campo. `CameraCapture.tsx` la invoca tras el reconocimiento IA. El schema no cambia — `sku UNIQUE NOT NULL` se mantiene; el valor se genera si el campo queda vacío al guardar.

**Tech Stack:** React 19, TypeScript, Supabase JS v2, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-22-code-resources-sku-design.md` — Bloque 2

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `src/lib/skuUtils.ts` | Crear | `nextAvailableSku(prefix, supabase)` — primer número libre |
| `src/test/skuUtils.test.ts` | Crear | Tests unitarios con mock de Supabase |
| `src/components/islands/ComponentForm.tsx` | Modificar | SKU opcional + auto-gen al cambiar categoría + aviso de conflicto |
| `src/test/ComponentForm.test.tsx` | Modificar | Actualizar tests existentes + añadir tests de auto-generación |
| `src/components/islands/CameraCapture.tsx` | Modificar | Llamar `nextAvailableSku` tras reconocimiento, pasarla al prefill |

---

## Task 1: Utilidad `nextAvailableSku`

**Files:**
- Create: `src/lib/skuUtils.ts`
- Create: `src/test/skuUtils.test.ts`

- [ ] **Escribir el test primero**

```typescript
// src/test/skuUtils.test.ts
import { describe, it, expect, vi } from 'vitest'
import { categoryPrefix, nextAvailableSku } from '../lib/skuUtils'

function makeSupabase(existingSkus: string[]) {
  return {
    from: () => ({
      select: () => ({
        like: () => Promise.resolve({
          data: existingSkus.map(sku => ({ sku })),
          error: null,
        }),
      }),
    }),
  } as any
}

describe('categoryPrefix', () => {
  it('devuelve prefijo correcto para cada categoría', () => {
    expect(categoryPrefix('Microcontrolador')).toBe('MCU')
    expect(categoryPrefix('Sensor')).toBe('SEN')
    expect(categoryPrefix('Actuador')).toBe('ACT')
    expect(categoryPrefix('Alimentación')).toBe('PWR')
    expect(categoryPrefix('Módulo')).toBe('MOD')
    expect(categoryPrefix('Pasivo')).toBe('PAS')
  })

  it('devuelve GEN para categoría desconocida', () => {
    expect(categoryPrefix('Desconocida')).toBe('GEN')
  })
})

describe('nextAvailableSku', () => {
  it('retorna MCU-001 cuando no hay SKUs', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase([]))
    expect(result).toBe('MCU-001')
  })

  it('retorna el primer número libre (sin gaps)', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-001', 'MCU-002']))
    expect(result).toBe('MCU-003')
  })

  it('salta gaps dejados por eliminaciones', async () => {
    // MCU-002 fue eliminado → primer libre es MCU-002
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-001', 'MCU-003']))
    expect(result).toBe('MCU-002')
  })

  it('ignora SKUs manuales que no siguen el patrón numérico', async () => {
    const result = await nextAvailableSku('MCU', makeSupabase(['MCU-ESP32', 'MCU-001']))
    expect(result).toBe('MCU-002')
  })

  it('formatea con padding de 3 dígitos', async () => {
    const skus = Array.from({ length: 9 }, (_, i) => `MCU-00${i + 1}`)
    const result = await nextAvailableSku('MCU', makeSupabase(skus))
    expect(result).toBe('MCU-010')
  })
})
```

- [ ] **Ejecutar el test y verificar que falla**

```bash
cd iot-assistant && npx vitest run src/test/skuUtils.test.ts
```

  Esperado: FAIL — `Cannot find module '../lib/skuUtils'`

- [ ] **Implementar `src/lib/skuUtils.ts`**

```typescript
const PREFIXES: Record<string, string> = {
  'Microcontrolador': 'MCU',
  'Sensor':           'SEN',
  'Actuador':         'ACT',
  'Alimentación':     'PWR',
  'Módulo':           'MOD',
  'Pasivo':           'PAS',
}

export function categoryPrefix(category: string): string {
  return PREFIXES[category] ?? 'GEN'
}

/**
 * Retorna el primer SKU disponible para el prefijo dado.
 * Consulta Supabase en tiempo real — no usar el estado local del formulario.
 */
export async function nextAvailableSku(
  prefix: string,
  // Aceptamos cualquier objeto con .from() para facilitar el testing
  supabase: { from: (table: string) => any },
): Promise<string> {
  const { data } = await supabase
    .from('components')
    .select('sku')
    .like('sku', `${prefix}-%`)

  const usedNumbers = new Set(
    (data ?? [])
      .map((r: { sku: string }) => parseInt(r.sku.replace(`${prefix}-`, ''), 10))
      .filter((n: number) => !isNaN(n) && n > 0)
  )

  let n = 1
  while (usedNumbers.has(n)) n++
  return `${prefix}-${String(n).padStart(3, '0')}`
}
```

- [ ] **Ejecutar el test y verificar que pasa**

```bash
cd iot-assistant && npx vitest run src/test/skuUtils.test.ts
```

  Esperado: PASS — todos los tests.

- [ ] **Commit**

```bash
git add src/lib/skuUtils.ts src/test/skuUtils.test.ts
git commit -m "feat(lib): add nextAvailableSku utility with first-available logic"
```

---

## Task 2: Actualizar `ComponentForm.tsx`

**Files:**
- Modify: `src/components/islands/ComponentForm.tsx`
- Modify: `src/test/ComponentForm.test.tsx`

- [ ] **Actualizar los tests de `ComponentForm`**

  Reemplazar el contenido de `src/test/ComponentForm.test.tsx` por:

```typescript
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
      return { insert: mockInsert }
    }),
  }),
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
```

- [ ] **Ejecutar los tests y verificar que fallan** (el form todavía no tiene SKU opcional)

```bash
npx vitest run src/test/ComponentForm.test.tsx
```

  Esperado: varios FAIL por `el campo SKU no es obligatorio` y `label auto-generado`.

- [ ] **Modificar `ComponentForm.tsx`** — cambios necesarios:

  1. Añadir imports al inicio:
  ```typescript
  import { categoryPrefix, nextAvailableSku } from '../../lib/skuUtils'
  ```

  2. Añadir `sku?: string` a la interfaz `ComponentFormProps` (la que ya existe en el archivo) y cambiar el estado inicial del SKU para leer el prefill:
  ```typescript
  // En la interfaz Props, añadir:
  interface ComponentFormProps {
    prefill?: {
      sku?:              string   // ← añadir
      name?:             string
      category?:         string
      platform_family?:  string
    }
  }

  // Estado inicial: usa prefill.sku si se proporcionó (vendrá de CameraCapture tras reconocimiento)
  const [sku, setSku]             = useState(prefill?.sku ?? '')
  const [skuPlaceholder, setSkuPlaceholder] = useState('MCU-001')
  const [skuConflict, setSkuConflict] = useState('')
  ```

  3. Añadir `useEffect` para auto-generar al cambiar categoría (o al montar):
  ```typescript
  useEffect(() => {
    const prefix = categoryPrefix(category)
    const supabase = createSupabaseBrowserClient()
    nextAvailableSku(prefix, supabase).then(setSkuPlaceholder).catch(() => {})
  }, [category])
  ```

  4. En `handleSubmit`, usar el placeholder si el campo está vacío:
  ```typescript
  const effectiveSku = sku.trim() || skuPlaceholder
  // Reemplazar todas las referencias a `sku` en el upsert por `effectiveSku`
  ```

  5. Modificar el campo SKU en el JSX:
  ```tsx
  <div>
    <label className="block text-xs font-medium text-slate-600 mb-0.5">Código interno</label>
    <p className="text-xs text-slate-400 mb-1">Se genera automáticamente si se deja vacío</p>
    <input
      value={sku}
      onChange={e => { setSku(e.target.value); setSkuConflict('') }}
      placeholder={skuPlaceholder}
      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-400"
    />
    {skuConflict && (
      <p className="text-xs text-amber-600 mt-1">{skuConflict}</p>
    )}
  </div>
  ```

  6. En el catch de `handleSubmit`, detectar conflicto 23505:
  ```typescript
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Error desconocido'
    if (msg.includes('23505') || msg.includes('duplicate key')) {
      nextAvailableSku(categoryPrefix(category), createSupabaseBrowserClient())
        .then(suggestion => setSkuConflict(`Este código ya está en uso, sugerencia: ${suggestion}`))
        .catch(() => {})
    }
    setError(msg)
  }
  ```

  **Nota sobre los tests de submit:** El test `'estado success muestra panel verde'` ya no necesita rellenar el campo SKU antes de hacer submit — el valor auto-generado (placeholder) se usa si el campo queda vacío. El test existente que tipea en `getByPlaceholderText('ESP32-001')` fallará porque el placeholder ahora es dinámico (`skuPlaceholder`); está reemplazado por el nuevo test de la suite `ComponentForm.test.tsx` provista arriba.

- [ ] **Ejecutar los tests y verificar que pasan**

```bash
cd iot-assistant && npx vitest run src/test/ComponentForm.test.tsx
```

  Esperado: todos los tests PASS.

- [ ] **Ejecutar suite completa para detectar regresiones**

```bash
cd iot-assistant && npm test
```

  Esperado: todos los tests PASS.

- [ ] **Commit**

```bash
git add src/components/islands/ComponentForm.tsx src/test/ComponentForm.test.tsx
git commit -m "feat(form): SKU optional with auto-generation by category"
```

---

## Task 3: Actualizar `CameraCapture.tsx`

**Files:**
- Modify: `src/components/islands/CameraCapture.tsx`

**Contexto del archivo:** `CameraCapture.tsx` gestiona el flujo de captura de foto y reconocimiento IA. En la línea ~23 llama a `setPrefill(result)` donde `result` es del tipo `RecognizeResponse` (definido en `api.ts`) y `prefill` es `Record<string, unknown> | null`. El handler que contiene esta llamada ya es `async` (porque `await recognizeComponent(...)`).

- [ ] **Añadir imports de utilidades SKU** al inicio del archivo (junto a los imports existentes):

```typescript
import { categoryPrefix, nextAvailableSku } from '../../lib/skuUtils'
import { createSupabaseBrowserClient } from '../../lib/supabase'
```

- [ ] **Localizar la línea `setPrefill(result)`** (alrededor de la línea 23) y reemplazarla:

  Antes:
  ```typescript
  setPrefill(result)
  ```

  Después:
  ```typescript
  const prefix = categoryPrefix(result.category)
  const supabase = createSupabaseBrowserClient()
  const autoSku = await nextAvailableSku(prefix, supabase).catch(() => '')
  setPrefill({ ...result, sku: autoSku })
  ```

  Nota: `result.category` es un string (campo de `RecognizeResponse`). `{ ...result, sku: autoSku }` es compatible con `Record<string, unknown>` — el spread convierte los campos del objeto al tipo genérico.

- [ ] **Actualizar el `useEffect` de prefill en `ComponentForm.tsx`** para sincronizar el campo SKU cuando cambia el prefill (el componente puede re-renderizar con nuevos valores):

  ```typescript
  useEffect(() => {
    if (prefill?.name)            setName(prefill.name as string)
    if (prefill?.category)        setCategory(prefill.category as string)
    if (prefill?.platform_family) setPlatform(prefill.platform_family as string)
    if (prefill?.sku)             setSku(prefill.sku as string)
  }, [prefill])
  ```

- [ ] **Ejecutar los tests para verificar que no hay regresiones**

```bash
cd iot-assistant && npm test
```

  Esperado: todos los tests PASS.

- [ ] **Commit**

```bash
git add iot-assistant/src/components/islands/CameraCapture.tsx iot-assistant/src/components/islands/ComponentForm.tsx
git commit -m "feat(camera): auto-generate SKU after AI recognition"
```

---

## Verificación final

- [ ] Abrir el formulario de nuevo componente:
  - El campo SKU muestra `MCU-001` como placeholder (sin texto, auto-generado)
  - Al cambiar a "Sensor", el placeholder cambia a `SEN-001` (o el siguiente disponible)
  - Guardar sin tocar SKU crea el componente con el código auto-generado
  - Escribir un SKU existente muestra aviso con sugerencia alternativa

- [ ] Usar el flujo de escaneo con cámara:
  - Tras el reconocimiento, el campo SKU viene pre-rellenado con el código generado
  - El usuario puede modificarlo antes de confirmar

- [ ] Verificar en **móvil y escritorio** (recordar: toda vista debe verificarse en ambos breakpoints)
