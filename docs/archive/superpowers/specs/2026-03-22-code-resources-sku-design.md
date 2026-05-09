# Spec: Recursos de Código Versionados + Mejora de SKU

**Fecha:** 2026-03-22
**Estado:** Aprobado
**Referencia funcional:** FUNCTIONAL_SPEC.md §3.7.1, §3.7.2

---

## Alcance

Dos bloques de mejora independientes:

1. **Recursos de código versionados** — reemplaza el `CodeGenerator` actual por un panel que genera, analiza y persiste código en `project_code_resources` con historial de versiones por archivo.
2. **SKU auto-generado** — elimina la fricción de alta de componentes convirtiendo el campo SKU en opcional con auto-generación por categoría.

---

## Bloque 1: Recursos de Código Versionados

### Contexto

El `CodeGenerator.tsx` actual genera código pero no lo persiste. La tabla `project_code_resources` existe en el schema con RLS configurada pero no se usa desde el frontend. El módulo 3.7.2 (análisis de código) no tiene implementación.

### Cambios en schema (migración)

```sql
-- Versioning: DEFAULT 1 hace backfill de todas las filas existentes (comportamiento PostgreSQL).
-- Ninguna fila queda con version = NULL.
ALTER TABLE project_code_resources
  ADD COLUMN version   INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN parent_id UUID REFERENCES project_code_resources(id) ON DELETE SET NULL;

-- Índice de consulta por filename
CREATE INDEX idx_code_resources_filename
  ON project_code_resources(project_id, filename);

-- Evitar versiones duplicadas en concurrencia
ALTER TABLE project_code_resources
  ADD CONSTRAINT uq_resource_version UNIQUE (project_id, filename, version);
```

`log_entry_id` permanece nullable — los recursos no están obligatoriamente ligados a una entrada de bitácora.

### Tipos TypeScript

Para evitar colisión con la interfaz `CodeResource` exportada por `api.ts` (que describe la respuesta de `/ai/code/generate`), el tipo local del island se llama `SavedCodeResource`:

```typescript
// src/lib/codeResources.ts
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
```

El tipo `CodeResource` de `api.ts` (respuesta de generación) no cambia.

### Componente `CodeResources.tsx`

Reemplaza a `CodeGenerator.tsx`. Island React con dos modos controlados por tab interno.

#### Props

```typescript
interface Props {
  projectId:        string
  projectTitle:     string   // requerido por /ai/code/generate
  projectType:      string   // diy | prototype | professional
  bom:              { component_name: string; quantity_required: number }[]
  initialResources: SavedCodeResource[]
}
```

#### Estado interno

```typescript
type View          = 'generate' | 'analyze'
type AnalyzeMode   = 'review' | 'optimize' | 'refactor'
type AnalyzeSource = 'existing' | 'paste'
```

Los recursos se almacenan en estado local (`useState<SavedCodeResource[]>`), inicializados con `initialResources` y actualizados tras cada operación. El estado local es la fuente de verdad para la UI; se recarga desde Supabase solo al montar (a través de `initialResources` SSR).

#### Modo Generar

- Controles: selector de entorno (arduino / platformio / esp-idf / zephyr / rust / esphome / micropython) y modo (Esqueleto / Completo).
- Al confirmar: `POST /ai/code/generate` (incluye `project_title`) → por cada `CodeResource` en la respuesta:
  - Consulta Supabase: `SELECT MAX(version) FROM project_code_resources WHERE project_id=? AND filename=?`
  - `version = maxDB + 1` si existe, `version = 1` si es nuevo
  - `parent_id`: si el filename ya tiene versiones, `parent_id = id de la última versión`; si es nuevo, `parent_id = null`
  - `is_generated = true`
- Actualiza estado local con los recursos insertados.

**Modelo de versioning para generación:**
Cuando se regenera un archivo ya existente, la nueva generación es hijo de la versión anterior (`parent_id` apunta al `id` de la última versión). Esto mantiene una cadena lineal coherente independientemente del origen (generación o análisis).

#### Modo Analizar

**Fuente del código:**
- *Recurso existente*: dropdown agrupado por filename, versiones ordenadas desc (default: más reciente). Pre-rellena textarea, lenguaje y environment del recurso seleccionado. El `environment` se hereda del recurso fuente y es editable.
- *Pegar código*: textarea libre + selector de lenguaje + selector de entorno + campo de nombre de archivo.

**Tipo de análisis:** tres botones exclusivos:

| Botón | Modo | Foco |
|-------|------|------|
| Revisar | `review` | Bugs, condiciones de carrera, memory leaks, APIs mal usadas |
| Optimizar | `optimize` | Consumo de memoria/energía, ciclos CPU, tamaño de binario |
| Refactorizar | `refactor` | Claridad, modularidad, convenciones del entorno |

Al confirmar:
1. `POST /ai/code/analyze` → `{ explanation, improved_code }`
2. Consulta `SELECT MAX(version)` desde Supabase (siempre fresco, no desde estado local) para evitar versiones obsoletas
3. `INSERT project_code_resources` con mismo `filename`, `version = maxDB + 1`, `parent_id = id_fuente`, `is_generated = false`, `environment` = environment del recurso fuente o seleccionado por el usuario
4. En conflicto de unicidad (error 23505), reintenta re-consultando `MAX(version)` desde Supabase (máx. 2 reintentos — no incrementa localmente)

#### Lista de recursos

Debajo del panel de acción, muestra una tarjeta por filename (versión más reciente):

```
┌─────────────────────────────────────────────┐
│ main.ino                          v4 ▾      │
│ C++ · arduino · hace 2 horas                │
│ 3 versiones anteriores                      │
│                          [Descargar] [✕]    │
└─────────────────────────────────────────────┘
```

- **Selector de versión** (`▾`): despliega todas las versiones del filename ordenadas desc. Al seleccionar una, se muestra su contenido en modo solo lectura. El botón `[✕]` elimina la versión actualmente seleccionada (ver Eliminar).
- **Descargar**: `createObjectURL(new Blob([content]))` → `<a download={filename}>` — sin llamada al servidor.
- **Eliminar**: disponible en cualquier versión (seleccionada via `▾`). Muestra confirmación inline (texto rojo + botón confirmar). Optimistic update: la versión se elimina del estado local. Si era la más reciente, se muestra la anterior como activa. Si era la única, la tarjeta desaparece. `parent_id` de las versiones hijas queda `null` (ON DELETE SET NULL en schema) — la cadena se preserva aunque quede con gaps. En caso de error, se revierte el estado local con mensaje inline en la tarjeta.
- **Eliminar via Supabase**: `DELETE FROM project_code_resources WHERE id = ? AND project_id = ?` — la RLS garantiza que solo el dueño del proyecto puede eliminar.

#### Panel de explicación

Tras un análisis exitoso, se muestra un panel colapsable encima de la lista con el `explanation` en markdown. Se cierra automáticamente al iniciar una nueva operación.

### API: `POST /ai/code/analyze`

**Request:**
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
```

**Response:**
```python
class CodeAnalyzeResponse(BaseModel):
    explanation:   str  # markdown
    improved_code: str
```

**Prompts por modo y `project_type`:**

| Modo | diy | prototype | professional |
|------|-----|-----------|--------------|
| `review` | Detecta bugs obvios y mal uso de APIs | Detecta bugs, condiciones de carrera, memory leaks | Análisis exhaustivo: const correctness, manejo de errores robusto, thread safety |
| `optimize` | Simplificaciones de código | Reducir memoria/CPU, tamaño de binario | Stack depth, heap fragmentation, consumo energético en deep sleep |
| `refactor` | Mejorar legibilidad y nombres | Separar configuración de lógica, funciones cortas | Patrones del entorno (ESP-IDF components, Zephyr modules), separación de responsabilidades |

### Cambio en `projects/[id].astro`

```astro
<!-- Antes -->
<CodeGenerator client:load projectId={id} projectTitle={project.title} projectType={project.project_type} bom={bom} />

<!-- Después -->
<CodeResources
  client:load
  projectId={id}
  projectTitle={project.title}
  projectType={project.project_type}
  bom={bom}
  initialResources={codeResources}
/>
```

`initialResources` se carga en el servidor con:
```sql
SELECT * FROM project_code_resources
WHERE project_id = $1
ORDER BY filename, version DESC
```

### Cambio en `src/lib/api.ts`

Agregar función para el nuevo endpoint. La interfaz `CodeResource` existente (respuesta de generación) no se modifica:

```typescript
export interface CodeAnalyzeResponse {
  explanation:   string
  improved_code: string
}

export async function analyzeCode(
  payload: {
    code:         string
    language:     string
    environment?: string
    mode:         'review' | 'optimize' | 'refactor'
    project_type: string
  },
  token: string,
): Promise<CodeAnalyzeResponse> {
  return apiFetch('/ai/code/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, token)
}
```

### Función de utilidad en `src/lib/codeResources.ts`

```typescript
import type { SavedCodeResource } from './codeResources'

// Obtiene el MAX(version) de un filename desde el estado local.
// Solo usar para display; para INSERTs, siempre consultar Supabase.
export function localMaxVersion(resources: SavedCodeResource[], filename: string): number {
  return resources
    .filter(r => r.filename === filename)
    .reduce((max, r) => Math.max(max, r.version), 0)
}
```

### Manejo de errores

| Situación | Origen | Mensaje al usuario |
|-----------|--------|--------------------|
| Claude no responde / timeout | 503 | "La IA se encuentra en la oficina sin teléfono, por favor intenta más tarde" |
| Respuesta no parseable | 422 | "La IA y yo no nos estamos entendiendo, intenta más tarde" |
| Token inválido | 401 | Redirige a login (comportamiento global existente) |
| Código vacío | frontend | Validado antes de enviar, botón deshabilitado |
| Fallo al guardar en Supabase | frontend | "El código está listo pero no pudo guardarse, ¿reintentamos?" con botón de reintento |
| Fallo al eliminar | frontend | Optimistic update revertido, mensaje inline en la tarjeta |
| Conflicto de versión concurrente | frontend | Reintento silencioso (máx. 2), re-consultando MAX(version) en Supabase |

Todos los errores de IA se muestran inline en el panel, no como modales. El estado de error se limpia al iniciar una nueva operación.

---

## Bloque 2: SKU Auto-generado en Alta de Componentes

### Contexto

El campo `sku TEXT UNIQUE NOT NULL` es actualmente obligatorio en el formulario. Muchos componentes no tienen SKU de fabricante visible, y el concepto de "código interno" es confuso para usuarios no técnicos.

### Sin cambios en schema

`sku` se mantiene `UNIQUE NOT NULL` — el valor se genera automáticamente cuando el usuario no proporciona uno. El ID único real del componente es el `UUID` primario; el SKU es una etiqueta humana de conveniencia.

### Lógica de auto-generación (frontend)

Prefijos por categoría:

| Categoría | Prefijo |
|-----------|---------|
| Microcontrolador | MCU |
| Sensor | SEN |
| Actuador | ACT |
| Alimentación | PWR |
| Módulo | MOD |
| Pasivo | PAS |

La auto-generación usa búsqueda del primer SKU disponible (no count), para ser robusta ante eliminaciones y colisiones con SKUs manuales:

```typescript
async function nextAvailableSku(prefix: string): Promise<string> {
  // Obtiene todos los SKUs existentes con ese prefijo
  const { data } = await supabase
    .from('components')
    .select('sku')
    .like('sku', `${prefix}-%`)

  const usedNumbers = new Set(
    (data ?? [])
      .map(r => parseInt(r.sku.replace(`${prefix}-`, ''), 10))
      .filter(n => !isNaN(n))
  )

  // Busca el primer número libre desde 1
  let n = 1
  while (usedNumbers.has(n)) n++
  return `${prefix}-${String(n).padStart(3, '0')}`
}
```

Esta función evita colisiones aunque se hayan eliminado componentes con SKUs previos o el usuario haya ingresado SKUs manuales que coincidan con el patrón.

### Cambios en `ComponentForm.tsx`

- **Label**: "Código SKU" → "Código interno" con sublabel "Se genera automáticamente si se deja vacío"
- **Campo**: no es `required`. Placeholder dinámico muestra el valor auto-generado (ej. `MCU-003`).
- **Trigger**: al cambiar la categoría, se llama a `nextAvailableSku(prefix)` y se pre-rellena el campo (editable).
- **Validación de conflicto**: si el usuario escribe un SKU y ya existe → aviso inline "Este código ya está en uso, sugerencia: `[SKU-alternativo]`" con botón para aplicar la sugerencia. La sugerencia usa `nextAvailableSku` con el prefijo correcto para ese SKU.
- **Al guardar**: si el campo está vacío, se usa el valor auto-generado calculado (o se recalcula si el campo fue limpiado). Si tiene valor, se usa el del usuario.
- **Si el auto-generado falla al guardar** (colisión en el instante del INSERT): se muestra el mensaje de error de Supabase con sugerencia de reintento — la función `nextAvailableSku` se vuelve a llamar y actualiza el campo.

### Cambios en `CameraCapture.tsx`

Cuando el reconocimiento por IA devuelve una categoría, se llama a `nextAvailableSku(prefix)` y se pre-rellena el campo SKU en el formulario pre-rellenado antes de mostrárselo al usuario. Sin cambios en `api/main.py` — la respuesta de `/ai/recognize` no incluye SKU.

---

## Archivos modificados / creados

### Frontend
| Archivo | Cambio |
|---------|--------|
| `src/components/islands/CodeResources.tsx` | Nuevo — reemplaza CodeGenerator |
| `src/components/islands/CodeGenerator.tsx` | Eliminado |
| `src/components/islands/ComponentForm.tsx` | Modificado — SKU opcional + auto-generación |
| `src/components/islands/CameraCapture.tsx` | Modificado — auto-generación de SKU post-reconocimiento |
| `src/pages/projects/[id].astro` | Modificado — reemplaza import de CodeGenerator, carga initialResources, pasa projectTitle |
| `src/lib/api.ts` | Modificado — agrega `analyzeCode` y `CodeAnalyzeResponse` |
| `src/lib/codeResources.ts` | Nuevo — `SavedCodeResource`, `localMaxVersion`, `nextAvailableSku` |

### Backend
| Archivo | Cambio |
|---------|--------|
| `api/main.py` | Agrega `POST /ai/code/analyze` con `CodeAnalyzeRequest` y `CodeAnalyzeResponse` |

### Base de datos
| Archivo | Cambio |
|---------|--------|
| `supabase/schema.sql` | Agrega columnas `version`, `parent_id` y constraints a `project_code_resources` |
| `supabase/migrations/` | Nueva migración con los `ALTER TABLE` (backfill automático de `version=1` en filas existentes) |

---

## Criterios de aceptación

### Recursos de código
- [ ] Generar código guarda en `project_code_resources` y aparece en la lista inmediatamente
- [ ] Regenerar un archivo existente crea nueva versión con `parent_id` apuntando a la versión anterior
- [ ] Analizar código (desde recurso existente y desde texto pegado) guarda resultado como nueva versión
- [ ] `environment` se hereda del recurso fuente al analizar; es editable antes de enviar
- [ ] La lista agrupa por filename y muestra la versión más reciente por defecto
- [ ] El selector de versión permite navegar al historial completo
- [ ] Eliminar cualquier versión hace optimistic update y revierte en caso de error
- [ ] Descargar funciona sin llamada al servidor
- [ ] Los tres modos de análisis (review / optimize / refactor) producen respuestas diferenciadas para los tres tipos de proyecto (diy / prototype / professional)
- [ ] Los mensajes de error de IA usan el tono divertido establecido
- [ ] En conflicto de versión concurrente, re-consulta `MAX(version)` en Supabase y reintenta (máx. 2 veces)
- [ ] `projectTitle` se pasa correctamente a `/ai/code/generate`

### SKU auto-generado
- [ ] Al seleccionar categoría, el campo SKU se pre-rellena con el primer SKU disponible (no basado en count)
- [ ] El campo es editable y se puede dejar vacío (usa el auto-generado al guardar)
- [ ] La auto-generación es robusta ante eliminaciones y SKUs manuales que coincidan con el patrón
- [ ] Conflicto de SKU muestra aviso inline con sugerencia aplicable en un clic
- [ ] El flujo de reconocimiento por IA también pre-rellena el SKU
- [ ] Si el auto-generado colisiona al INSERT, se recalcula y se actualiza el campo
