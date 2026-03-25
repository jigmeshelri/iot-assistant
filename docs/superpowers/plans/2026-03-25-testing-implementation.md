# Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la estrategia de testing definida en `docs/superpowers/specs/2026-03-25-testing-strategy-design.md`: arreglar tests rotos, configurar coverage, agregar unit tests (target 80%) y E2E tests para todos los acceptance criteria de `FUNCTIONAL_SPEC.md`.

**Architecture:** Unit tests con Vitest + React Testing Library (jsdom). E2E tests con Playwright contra dev server (localhost:4323). Auth fixture con Supabase password sign-in. Seed fixture para datos de test.

**Tech Stack:** Vitest 4.1, @vitest/coverage-v8, Playwright 1.58, React Testing Library, @supabase/supabase-js

**Refs:**
- Testing strategy: `docs/superpowers/specs/2026-03-25-testing-strategy-design.md`
- Acceptance criteria: `FUNCTIONAL_SPEC.md` (AC-3.1.1 → AC-4.4)
- Existing tests: `src/test/*.test.{ts,tsx}`, `e2e/ui/*.spec.ts`

---

## Archivos a crear/modificar

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Modify | `vitest.config.ts` | Agregar coverage config |
| Modify | `src/test/ComponentForm.test.tsx` | Fix mock para LocationPicker |
| Modify | `src/test/CameraCapture.test.tsx` | Fix mock para LocationPicker |
| Create | `src/test/InventorySearch.test.tsx` | Unit tests para filtrado/búsqueda |
| Create | `src/test/InventoryDetail.test.tsx` | Unit tests para vista/edición/delete |
| Create | `src/test/BOMTable.test.tsx` | Unit tests para add/edit/delete BOM |
| Create | `src/test/LocationTree.test.tsx` | Unit tests para árbol y sub-ubicaciones |
| Create | `src/test/LocationPicker.test.tsx` | Unit tests para selector dropdown |
| Create | `src/test/ProjectHeader.test.tsx` | Unit tests para status transitions |
| Create | `src/test/StockConsumption.test.tsx` | Unit tests para consumo/undo |
| Create | `src/test/ConnectivityEditor.test.tsx` | Unit tests para toggle tags |
| Create | `src/test/SpecsEditor.test.tsx` | Unit tests para key-value editor |
| Create | `src/test/ProjectFilters.test.tsx` | Unit tests para filter tabs |
| Create | `src/test/api.test.ts` | Unit tests para api.ts |
| Create | `e2e/ui/auth.spec.ts` | E2E: AC-4.1, AC-4.3 |
| Create | `e2e/ui/inventory-detail.spec.ts` | E2E: AC-3.1.3, AC-3.1.4, AC-3.1.5, AC-3.1.8 |
| Create | `e2e/ui/inventory-create.spec.ts` | E2E: AC-3.1.1, AC-3.1.7 |
| Create | `e2e/ui/inventory-search.spec.ts` | E2E: AC-3.1.2, AC-3.1.6 |
| Create | `e2e/ui/locations.spec.ts` | E2E: AC-3.3.1 → AC-3.3.6 |
| Create | `e2e/ui/qr.spec.ts` | E2E: AC-3.4.1, AC-3.4.2 |
| Create | `e2e/ui/project-lifecycle.spec.ts` | E2E: AC-3.6.1 → AC-3.6.8 |
| Create | `e2e/ui/project-consumption.spec.ts` | E2E: AC-3.6.9 → AC-3.6.11 |
| Create | `e2e/ui/community.spec.ts` | E2E: AC-3.6.12 → AC-3.6.17 |
| Create | `e2e/ui/ai-discover.spec.ts` | E2E: AC-3.5.1 → AC-3.5.3 |
| Create | `e2e/ui/ai-plan.spec.ts` | E2E: AC-3.5.4 → AC-3.5.6 |
| Create | `e2e/ui/ai-scan.spec.ts` | E2E: AC-3.2.1 → AC-3.2.4 |
| Create | `e2e/ui/code-generation.spec.ts` | E2E: AC-3.7.1 → AC-3.7.5 |
| Modify | `e2e/fixtures/seed.ts` | Ampliar datos de test para nuevos flujos |

---

## Paso 0: Fix + Configuración (bloqueante)

### Task 1: Configurar coverage en Vitest

**Files:**
- Modify: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1:** Instalar @vitest/coverage-v8

```bash
npm install -D @vitest/coverage-v8
```

- [ ] **Step 2:** Agregar configuración de coverage a vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@astrojs/react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/test/**/*.test.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/components/islands/**', 'src/lib/**'],
      exclude: ['src/test/**', 'src/env.d.ts'],
      thresholds: {
        lines: 80,
      },
    },
  },
})
```

- [ ] **Step 3:** Agregar script de coverage a package.json

```json
"test:coverage": "vitest run --coverage"
```

- [ ] **Step 4:** Verificar que el comando funciona: `npm run test:coverage`

- [ ] **Step 5:** Commit: `chore: configure vitest coverage with 80% line threshold`

---

### Task 2: Fix mock de LocationPicker en tests existentes

**Files:**
- Modify: `src/test/ComponentForm.test.tsx`
- Modify: `src/test/CameraCapture.test.tsx`

El problema: `ComponentForm` importa `LocationPicker` que hace `supabase.from('locations').select('*').order('name')` en mount. El mock de supabase no soporta esta cadena.

**Solución:** Mockear `LocationPicker` como módulo completo en ambos test files.

- [ ] **Step 1:** Agregar mock de LocationPicker en ComponentForm.test.tsx

Agregar después de la línea `vi.mock('../lib/supabase', ...)` (línea 28):

```typescript
vi.mock('../components/islands/LocationPicker', () => ({
  default: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <button data-testid="location-picker" onClick={() => onChange('loc-1')}>
      {value ?? 'Sin ubicación'}
    </button>
  ),
}))

vi.mock('../components/islands/ConnectivityEditor', () => ({
  default: ({ value, onChange }: { value: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void }) => (
    <div data-testid="connectivity-editor">mock</div>
  ),
}))

vi.mock('../components/islands/SpecsEditor', () => ({
  default: ({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) => (
    <div data-testid="specs-editor">mock</div>
  ),
}))
```

- [ ] **Step 2:** Agregar mismo mock de LocationPicker en CameraCapture.test.tsx

Agregar después del mock de supabase (línea 27):

```typescript
vi.mock('../components/islands/LocationPicker', () => ({
  default: () => <div data-testid="location-picker">mock</div>,
}))
vi.mock('../components/islands/ConnectivityEditor', () => ({
  default: () => <div data-testid="connectivity-editor">mock</div>,
}))
vi.mock('../components/islands/SpecsEditor', () => ({
  default: () => <div data-testid="specs-editor">mock</div>,
}))
```

- [ ] **Step 3:** También expandir el mock de supabase en ComponentForm.test.tsx para manejar la tabla `locations`:

Modificar el `from` mock para agregar un case para 'locations':

```typescript
from: vi.fn((table: string) => {
  if (table === 'components') {
    return {
      upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
      select: vi.fn(() => ({ like: mockLike })),
    }
  }
  if (table === 'locations') {
    return {
      select: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })),
    }
  }
  return { insert: mockInsert }
}),
```

- [ ] **Step 4:** Ejecutar tests: `npx vitest run --reporter=verbose`

Expected: todos 30 tests pasan (18 existentes + los 12 que estaban fallando)

- [ ] **Step 5:** Commit: `fix(tests): mock LocationPicker/ConnectivityEditor/SpecsEditor in existing tests`

---

## Fase 1: Unit Tests — Componentes críticos

### Task 3: Unit tests para InventorySearch

**Files:**
- Create: `src/test/InventorySearch.test.tsx`

**Tests a implementar:**
- Renderiza input de búsqueda y chips de categoría
- Filtrado por nombre (case-insensitive): "esp" → muestra ESP32, filtra DHT22
- Filtrado por SKU: "MCU" → muestra solo microcontroladores
- Filtrado por categoría chip: click "Sensor" → solo sensores, click "Todos" → todos
- Empty state: query sin resultados → muestra "Sin resultados para [query]"
- Connectivity badges: componente con WiFi+BLE → muestra 2 tags verdes en mobile
- Overflow: componente con 5+ caps → muestra 3 + "+2"

**Mock:** Supabase no necesario (el componente recibe `items` como prop, filtra client-side).

- [ ] **Step 1:** Crear test file con 7 test cases
- [ ] **Step 2:** Ejecutar y verificar que pasan: `npx vitest run src/test/InventorySearch.test.tsx`
- [ ] **Step 3:** Commit: `test: add InventorySearch unit tests (search, filter, connectivity)`

---

### Task 4: Unit tests para InventoryDetail

**Files:**
- Create: `src/test/InventoryDetail.test.tsx`

**Tests:**
- Modo vista: renderiza nombre, SKU, categoría, plataforma, specs, conectividad
- Modo vista: muestra connectivity badges con colores por protocolo
- Botón "Editar" → muestra formulario de edición
- Modo edición: inputs para nombre, categoría, plataforma, notas
- Botón "Cancelar" → vuelve a modo vista
- Botón "Eliminar" → llama confirm + supabase.delete
- Guardar → llama supabase.update en components + stock

**Mock:** Supabase (update, delete), LocationPicker, ConnectivityEditor, SpecsEditor

- [ ] **Step 1:** Crear test file con 7 test cases
- [ ] **Step 2:** Ejecutar y verificar: `npx vitest run src/test/InventoryDetail.test.tsx`
- [ ] **Step 3:** Commit: `test: add InventoryDetail unit tests (view, edit, delete)`

---

### Task 5: Unit tests para BOMTable

**Files:**
- Create: `src/test/BOMTable.test.tsx`

**Tests:**
- Modo read-only: renderiza items con nombre, cantidad, estado badge
- Modo editable: muestra botón "+ Añadir componente"
- Add item: llenar nombre + cantidad → click guardar → item aparece
- Edit quantity: click cantidad → input → blur → actualiza
- Delete item: click × → confirm → item desaparece
- Estado badges: available=green, partial=amber, missing=red, incompatible=orange

**Mock:** Supabase (insert, update, delete para project_bom)

- [ ] **Step 1:** Crear test file con 6 test cases
- [ ] **Step 2:** Ejecutar y verificar
- [ ] **Step 3:** Commit: `test: add BOMTable unit tests (CRUD, state badges)`

---

### Task 6: Unit tests para LocationTree + LocationPicker

**Files:**
- Create: `src/test/LocationTree.test.tsx`
- Create: `src/test/LocationPicker.test.tsx`

**LocationTree tests:**
- Renderiza ubicaciones raíz
- Expande/colapsa nodos con hijos
- Muestra conteo de componentes si stockCounts prop presente
- Botón "+" crea sub-ubicación con parent_id

**LocationPicker tests:**
- Estado cerrado muestra nombre seleccionado o "Sin ubicación"
- Click abre dropdown con árbol
- Seleccionar nodo → llama onChange con id
- "Sin ubicación" → llama onChange(null)
- Click outside cierra dropdown

**Mock:** Supabase (select locations, insert location)

- [ ] **Step 1:** Crear LocationTree.test.tsx con 4 tests
- [ ] **Step 2:** Crear LocationPicker.test.tsx con 5 tests
- [ ] **Step 3:** Ejecutar ambos
- [ ] **Step 4:** Commit: `test: add LocationTree and LocationPicker unit tests`

---

### Task 7: Unit tests para ProjectHeader + StockConsumption

**Files:**
- Create: `src/test/ProjectHeader.test.tsx`
- Create: `src/test/StockConsumption.test.tsx`

**ProjectHeader tests:**
- Muestra título, status badge, progress bar
- Click pencil en título → input editable
- Status transitions: saved muestra "Iniciar", in_progress muestra "Pausar/Completar/Abandonar"
- Click "Iniciar" → llama supabase.update(status: 'in_progress')
- Botón eliminar → confirm → delete

**StockConsumption tests:**
- Muestra progress bar "N de M utilizados"
- Componente disponible → botón "Usar"
- Componente faltante → badge "Falta", botón deshabilitado
- Componente usado → badge "Usado" + botón "↩ Deshacer"
- Consumir → insert consumed + update stock qty

**Mock:** Supabase

- [ ] **Step 1:** Crear ProjectHeader.test.tsx con 5 tests
- [ ] **Step 2:** Crear StockConsumption.test.tsx con 5 tests
- [ ] **Step 3:** Ejecutar ambos
- [ ] **Step 4:** Commit: `test: add ProjectHeader and StockConsumption unit tests`

---

### Task 8: Unit tests para editores + filtros + api

**Files:**
- Create: `src/test/ConnectivityEditor.test.tsx`
- Create: `src/test/SpecsEditor.test.tsx`
- Create: `src/test/ProjectFilters.test.tsx`
- Create: `src/test/api.test.ts`

**ConnectivityEditor tests:**
- Renderiza 6 protocolos (WiFi, BLE, LoRa, Zigbee, Thread, Ethernet)
- Click toggle → llama onChange con cap flippeada
- Tags activos tienen color por protocolo, inactivos son slate

**SpecsEditor tests:**
- Renderiza pares key-value existentes
- "+ Añadir" agrega fila vacía
- Editar key/value → llama onChange con record actualizado
- "×" elimina fila → llama onChange sin esa key

**ProjectFilters tests:**
- Tab "Todos" muestra todos los proyectos
- Tab "Activos" → solo status=in_progress
- Tab "Completados" → solo status=completed
- Tab "Archivados" → saved + paused + abandoned

**api.ts tests:**
- qrImageUrl construye URL correcta
- apiFetch agrega Authorization header
- apiFetch lanza error en status != ok

**Mock:** Solo para api.ts (fetch global mock)

- [ ] **Step 1:** Crear los 4 archivos de test
- [ ] **Step 2:** Ejecutar: `npx vitest run`
- [ ] **Step 3:** Verificar coverage: `npm run test:coverage`
- [ ] **Step 4:** Commit: `test: add editor, filter, and API unit tests`

---

## Fase 2: E2E Tests — Flujos funcionales

### Task 9: E2E Auth + Seed amplificado

**Files:**
- Create: `e2e/ui/auth.spec.ts`
- Modify: `e2e/fixtures/seed.ts`

**Auth E2E (AC-4.1, AC-4.3):**
- /login muestra formulario con botones OAuth (Google, GitHub) y input email
- Ruta protegida (/inventory) redirige a /login si no autenticado
- Post-login redirige a dashboard

**Seed amplificado:**
- Agregar ubicaciones de test: "Test-Taller" (raíz) + "Test-Cajón" (hijo)
- Agregar stock con location_id asignado
- Agregar project_bom items al proyecto de test
- Agregar project_log_entries al proyecto

- [ ] **Step 1:** Ampliar seed.ts con ubicaciones, BOM y log entries
- [ ] **Step 2:** Crear auth.spec.ts con 3 tests
- [ ] **Step 3:** Ejecutar: `npx playwright test e2e/ui/auth.spec.ts`
- [ ] **Step 4:** Commit: `test(e2e): add auth tests and expand seed data`

---

### Task 10: E2E Inventario completo

**Files:**
- Create: `e2e/ui/inventory-detail.spec.ts`
- Create: `e2e/ui/inventory-create.spec.ts`
- Create: `e2e/ui/inventory-search.spec.ts`

**inventory-detail.spec.ts (AC-3.1.3, AC-3.1.4, AC-3.1.5, AC-3.1.8):**
- Navegar a /inventory/[id] → ver nombre, SKU, categoría, specs, conectividad
- Click "Editar" → cambiar nombre → guardar → nombre actualizado visible
- Click "Eliminar" → confirmar → redirige a /inventory, item no está en lista
- Click +/− → cantidad cambia

**inventory-create.spec.ts (AC-3.1.1, AC-3.1.7):**
- Navegar a /inventory/new → llenar nombre, categoría, cantidad → guardar → aparece en lista
- Asignar ubicación durante creación → componente visible en esa ubicación

**inventory-search.spec.ts (AC-3.1.2, AC-3.1.6):**
- Escribir en buscador → lista filtra por nombre
- Click chip "Sensor" → solo sensores visibles
- Click "Todos" → todos visibles

- [ ] **Step 1:** Crear los 3 archivos de E2E spec
- [ ] **Step 2:** Ejecutar: `npx playwright test e2e/ui/inventory-*.spec.ts`
- [ ] **Step 3:** Commit: `test(e2e): add inventory CRUD, search, and filter tests`

---

### Task 11: E2E Ubicaciones + QR

**Files:**
- Create: `e2e/ui/locations.spec.ts`
- Create: `e2e/ui/qr.spec.ts`

**locations.spec.ts (AC-3.3.1 → AC-3.3.6):**
- Crear ubicación raíz → aparece en árbol
- Crear sub-ubicación con botón "+" → aparece anidada
- Navegar a detalle → ver componentes contenidos
- Editar nombre inline → persiste
- Eliminar ubicación vacía → desaparece
- Eliminar ubicación con stock → warning + orphaniza
- Verificar conteo de componentes en nodos del árbol

**qr.spec.ts (AC-3.4.1, AC-3.4.2):**
- Navegar a detalle de ubicación → QR visible
- Navegar a /l/[qr_code] → redirige a /locations/[id]

- [ ] **Step 1:** Crear locations.spec.ts con 7 tests
- [ ] **Step 2:** Crear qr.spec.ts con 2 tests
- [ ] **Step 3:** Ejecutar
- [ ] **Step 4:** Commit: `test(e2e): add locations tree/detail and QR tests`

---

### Task 12: E2E Proyectos lifecycle + BOM

**Files:**
- Create: `e2e/ui/project-lifecycle.spec.ts`
- Create: `e2e/ui/project-consumption.spec.ts`

**project-lifecycle.spec.ts (AC-3.6.1 → AC-3.6.8):**
- Crear proyecto manual → aparece en lista como "Guardado"
- Cambiar estado: Guardado → En curso → Completado
- Editar título inline → persiste
- Añadir entrada de bitácora → aparece en timeline
- Agregar item a BOM → aparece en tabla
- Editar cantidad BOM → persiste
- Eliminar item BOM → desaparece

**project-consumption.spec.ts (AC-3.6.9 → AC-3.6.11):**
- Marcar componente como usado → badge verde, stock descontado
- Componente faltante → badge rojo, botón deshabilitado
- Revertir consumo → stock restaurado

- [ ] **Step 1:** Crear project-lifecycle.spec.ts con 7 tests
- [ ] **Step 2:** Crear project-consumption.spec.ts con 3 tests
- [ ] **Step 3:** Ejecutar
- [ ] **Step 4:** Commit: `test(e2e): add project lifecycle, BOM, and consumption tests`

---

### Task 13: E2E Comunidad

**Files:**
- Create: `e2e/ui/community.spec.ts`

**community.spec.ts (AC-3.6.12 → AC-3.6.17):**
- Publicar proyecto completado → visible en /community
- Seleccionar entradas de bitácora para versión pública
- Fork de proyecto → copia en lista personal, contador incrementa
- Comentar en proyecto público → comentario visible
- Despublicar → desaparece de /community
- Datos privados (cantidad, ubicación) no visibles en vista pública

- [ ] **Step 1:** Crear community.spec.ts con 6 tests
- [ ] **Step 2:** Ejecutar
- [ ] **Step 3:** Commit: `test(e2e): add community publish, fork, and comment tests`

---

### Task 14: E2E IA (Discovery + Plan + Scan + Code)

**Files:**
- Create: `e2e/ui/ai-discover.spec.ts`
- Create: `e2e/ui/ai-plan.spec.ts`
- Create: `e2e/ui/ai-scan.spec.ts`
- Create: `e2e/ui/code-generation.spec.ts`

> **Nota:** Estos tests dependen de FastAPI funcionando. Si la API no está disponible, los tests deben fallar gracefully con un skip condition (`test.skip(noApiAvailable, 'FastAPI not available')`).

**ai-discover.spec.ts (AC-3.5.1 → AC-3.5.3):**
- /ai/discover → muestra formulario con opciones de refinamiento
- Guardar sugerencia → proyecto creado en estado Guardado

**ai-plan.spec.ts (AC-3.5.4 → AC-3.5.6):**
- /ai/plan → textarea para descripción + botón generar
- Refinamiento guiado → controlador, dificultad, restricciones visibles
- Guardar → proyecto con source "ai_plan"

**ai-scan.spec.ts (AC-3.2.1 → AC-3.2.4):**
- /inventory/new → zona de cámara visible
- Subir imagen → formulario pre-rellenado (requires API)
- Campos editables antes de confirmar

**code-generation.spec.ts (AC-3.7.1 → AC-3.7.5):**
- Tab "Generar" → selector de entorno + modo
- Entorno sugerido corresponde al tipo de proyecto
- Tab "Analizar" → resultado con mejoras tipadas

- [ ] **Step 1:** Crear los 4 archivos con skip condition para API
- [ ] **Step 2:** Ejecutar con API disponible si es posible
- [ ] **Step 3:** Commit: `test(e2e): add AI discovery, planning, scan, and code generation tests`

---

## Orden de ejecución

```
Task 1 (coverage config) → prerequisito
Task 2 (fix mocks) → prerequisito
    ↓
Paralelo:
  Task 3 (InventorySearch unit)
  Task 4 (InventoryDetail unit)
  Task 5 (BOMTable unit)
  Task 6 (LocationTree/Picker unit)
  Task 7 (ProjectHeader/Consumption unit)
  Task 8 (Editors/Filters/API unit)
    ↓
Task 9 (Auth E2E + seed) → prerequisito para E2E
    ↓
Paralelo:
  Task 10 (Inventory E2E)
  Task 11 (Locations + QR E2E)
  Task 12 (Projects E2E)
  Task 13 (Community E2E)
  Task 14 (AI E2E)
```

## Métricas de éxito

| Métrica | Antes | Target |
|---|---|---|
| Unit tests pasando | 18/30 | 30/30 + ~60 nuevos |
| Unit coverage (lines) | Sin medir | ≥ 80% |
| E2E specs | 5 archivos | 17 archivos |
| E2E tests | 38 | ~85 |
| AC coverage | ~30% | 100% (45/45) |
| Tests failing | 12 | 0 |
