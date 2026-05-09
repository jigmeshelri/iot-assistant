# Sprint 1: Inventario, Ubicaciones y QR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los gaps funcionales de inventario, ubicaciones y QR para que un usuario pueda completar el loop: crear componente → asignar ubicación → buscar/filtrar → editar → escanear QR → ver contenido.

**Architecture:** Astro 6 SSR pages + React 19 islands (client:load). Data via Supabase client (server-side para páginas, browser-side para islands). No FastAPI dependency en este sprint — todo es CRUD directo contra Supabase.

**Tech Stack:** Astro 6, React 19, Supabase JS v2, Tailwind CSS 4, TypeScript 5

**Convenciones de UX:**
- Mutaciones muestran error inline debajo del botón de acción (`text-xs text-red-500`)
- Loading usa `disabled` + texto "Guardando..." en botones
- Búsqueda sin resultados muestra "Sin resultados para [query]"
- Sub-ubicaciones usan `window.location.reload()` post-creación (patrón existente en LocationTree)
- `stock.location_id` FK es `ON DELETE SET NULL` — eliminar ubicación orphaniza items, no falla

**Decisión consciente — baja de inventario:**
- El spec 3.1 dice "baja lógica con historial". Para este sprint implementamos **hard delete** de la fila de `stock` (no del componente en el catálogo `components`). El historial de movimientos queda para un sprint posterior cuando se implemente la tabla `stock_movements`. Rationale: el MVP necesita poder eliminar items; el historial agrega complejidad sin valor inmediato para validación.

**Patrones existentes a seguir:**
- Pages usan `AppLayout` con slots `topbar` y `desktop-main`
- Islands reciben datos como props y usan `createSupabaseBrowserClient()` para mutaciones
- Colores de categoría: brand=MCU, amber=Sensor, violet=Actuador/Módulo, green=Alimentación, slate=Pasivo
- Cards: `bg-white rounded-2xl shadow-sm border border-slate-100`
- Inputs: `px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400`

---

## Archivos a crear/modificar

| Acción | Archivo | Responsabilidad |
|--------|---------|-----------------|
| Crear | `src/components/islands/InventorySearch.tsx` | Búsqueda + filtros interactivos para inventario |
| Crear | `src/components/islands/LocationManager.tsx` | Crear sub-ubicaciones, editar, eliminar ubicaciones |
| Crear | `src/components/islands/ConnectivityEditor.tsx` | Toggle tags para editar connectivity_caps |
| Crear | `src/components/islands/SpecsEditor.tsx` | Key-value editor para technical_specs |
| Crear | `src/components/islands/LocationPicker.tsx` | Selector de ubicación en árbol para asignar a stock |
| Modificar | `src/pages/inventory/index.astro` | Reemplazar búsqueda/filtros estáticos con island |
| Modificar | `src/pages/inventory/[id].astro` | Agregar edición inline, eliminar, asignar ubicación |
| Modificar | `src/pages/locations/[id].astro` | Agregar gestión de ubicación (editar, sub-ubicaciones, eliminar) |
| Modificar | `src/components/islands/LocationTree.tsx` | Soportar creación de sub-ubicaciones con parent_id, mostrar conteo |
| Modificar | `src/components/islands/ComponentForm.tsx` | Agregar campos connectivity_caps, technical_specs, location_id |

---

## Task 1: InventorySearch — Búsqueda y filtros interactivos

**Files:**
- Create: `src/components/islands/InventorySearch.tsx`
- Modify: `src/pages/inventory/index.astro`

El inventario actual pasa los items por server-side y muestra filtros estáticos. Este task reemplaza la sección de búsqueda y la lista con un island React que filtra client-side.

**Diseño del island:**
- Props: `items` (array de stock items pre-cargados server-side — evita llamadas extra)
- State: `query` (string), `activeCategory` (string | null)
- Filtrado: por nombre, SKU, categoría, ubicación (case-insensitive includes)
- **Nota:** El spec menciona filtrado por especificación técnica (voltaje, protocolo). Se difiere a un sprint posterior — requiere UI de filtros avanzados. El filtro por texto libre ya captura matches en nombre y SKU que cubren el 80% del caso de uso.
- Chips de categoría: click cambia `activeCategory`, "Todos" resetea a null
- Renderiza la misma lista de cards que el Astro actual (copiar HTML como JSX)

- [ ] **Step 1:** Crear `InventorySearch.tsx` con la interfaz de props

```tsx
// src/components/islands/InventorySearch.tsx
interface StockItem {
  id: string
  quantity: number
  component: {
    name: string
    sku: string
    category: string
    image_url: string | null
    platform_family: string | null
    connectivity_caps: Record<string, boolean>
  } | null
  location: {
    name: string
    parent: { name: string } | null
  } | null
}

interface Props {
  items: StockItem[]
}
```

Implementar:
- `useState` para `query` y `activeCategory`
- `useMemo` para filtrar items según query + category
- Input de búsqueda real (no placeholder `<span>`)
- Chips de categoría clickeables con toggle visual
- Lista de cards con el mismo markup que `inventory/index.astro:88-116`
- Agregar connectivity_caps como tags en la sublínea móvil (gap que el mockup tenía vs implementación)

- [ ] **Step 2:** Modificar `inventory/index.astro` — Mobile

Reemplazar las líneas 36-120 (sección mobile completa) con:
```astro
<div class="bg-white min-h-full lg:hidden">
  <InventorySearch items={stockItems ?? []} client:load />
</div>
```

- [ ] **Step 3:** Modificar `inventory/index.astro` — Desktop

Reemplazar la sección desktop-main (líneas 146-264) para usar el mismo island pero con prop `desktop={true}` que active el layout de tabla.

- [ ] **Step 4:** Verificar que búsqueda filtra por nombre, SKU y ubicación

- [ ] **Step 5:** Commit: `feat(inventory): add interactive search and category filters`

---

## Task 2: ConnectivityEditor + SpecsEditor — Editores reutilizables

**Files:**
- Create: `src/components/islands/ConnectivityEditor.tsx`
- Create: `src/components/islands/SpecsEditor.tsx`

Componentes reutilizables para editar connectivity_caps y technical_specs. Se usarán en ComponentForm (Task 5) y en la edición inline del detalle (Task 3).

### ConnectivityEditor

- Props: `value: Record<string, boolean>`, `onChange: (caps: Record<string, boolean>) => void`
- Toggle tags para: WiFi, BLE, LoRa, Zigbee, Thread, Ethernet
- Cada protocolo tiene su color (igual que `inventory/[id].astro:33-39`):
  - wifi: `bg-sky-50 text-sky-700 border-sky-200`
  - ble: `bg-blue-50 text-blue-700 border-blue-200`
  - lora: `bg-purple-50 text-purple-700 border-purple-200`
  - zigbee: `bg-teal-50 text-teal-700 border-teal-200`
  - thread: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - ethernet: `bg-indigo-50 text-indigo-700 border-indigo-200`
- Tag inactivo (todos): `bg-slate-100 text-slate-400 border border-transparent`
- Click toggle: flip boolean en el record

### SpecsEditor

- Props: `value: Record<string, string>`, `onChange: (specs: Record<string, string>) => void`
- Lista de key-value pairs editables
- Botón "+ Añadir spec" que agrega una fila vacía
- Cada fila: input key (placeholder "voltaje") + input value (placeholder "3.3V") + botón "×" para eliminar
- Keys comunes predefinidos como sugerencias: voltaje, corriente, interfaz, encapsulado, frecuencia, memoria

- [ ] **Step 1:** Crear `ConnectivityEditor.tsx` — tags toggleables con estado controlado

- [ ] **Step 2:** Crear `SpecsEditor.tsx` — lista editable de key-value pairs

- [ ] **Step 3:** Verificar ambos en aislamiento (montar temporalmente en una página de test)

- [ ] **Step 4:** Commit: `feat(components): add ConnectivityEditor and SpecsEditor islands`

---

## Task 3a: InventoryDetail island — Modo vista + eliminar

**Files:**
- Create: `src/components/islands/InventoryDetail.tsx`
- Modify: `src/pages/inventory/[id].astro`

Actualmente `/inventory/[id]` es Astro puro con un link "Editar" que apunta a una ruta inexistente. Convertimos el contenido en un island React para habilitar interactividad.

**Diseño de InventoryDetail:**
- Props: todo el item con component, location, stockId
- Modo vista (default): replica el layout actual de `[id].astro` como JSX
- Eliminar: botón "Eliminar del inventario" → `window.confirm()` → `supabase.from('stock').delete().eq('id', stockId)` → redirect `/inventory`
- Incluir connectivity_caps en la vista **móvil** (gap actual: solo se muestra en desktop)

- [ ] **Step 1:** Crear `InventoryDetail.tsx` con las props tipadas y modo vista (replica el mobile layout de `[id].astro:46-101` como JSX, incluyendo caps que faltan en mobile)

- [ ] **Step 2:** Agregar botón "Eliminar del inventario" con confirm + delete + redirect

- [ ] **Step 3:** Actualizar `[id].astro` — reemplazar el contenido mobile con `<InventoryDetail client:load />`, mantener desktop layout en Astro por ahora

- [ ] **Step 4:** Verificar vista y eliminación

- [ ] **Step 5:** Commit: `feat(inventory): add InventoryDetail island with delete`

---

## Task 3b: InventoryDetail — Modo edición inline

**Files:**
- Modify: `src/components/islands/InventoryDetail.tsx`

Agrega modo edición al island creado en Task 3a. Depende de Tasks 2 y 4.

- [ ] **Step 1:** Agregar state `editing: boolean` + botón "Editar" que lo toggle

- [ ] **Step 2:** En modo edición, reemplazar textos con inputs para: nombre, categoría (select), plataforma (select), notas (textarea), datasheet URL (input)

- [ ] **Step 3:** Integrar `ConnectivityEditor` (Task 2) para editar caps

- [ ] **Step 4:** Integrar `SpecsEditor` (Task 2) para editar technical_specs

- [ ] **Step 5:** Integrar `LocationPicker` (Task 4) para cambiar ubicación

- [ ] **Step 6:** Implementar "Guardar": upsert `components` (name, category, platform_family, connectivity_caps, technical_specs, datasheet_url) + update `stock` (location_id, notes). Mostrar error inline si falla, "Guardado" si OK, salir de modo edición.

- [ ] **Step 7:** Verificar flujo: ver → editar → cambiar campos → guardar → ver actualizado

- [ ] **Step 8:** Commit: `feat(inventory): add inline edit mode with all fields`

---

## Task 4: LocationPicker — Selector de ubicación en árbol

**Files:**
- Create: `src/components/islands/LocationPicker.tsx`

Selector reutilizable que muestra el árbol de ubicaciones del usuario y permite seleccionar una. Se usa en InventoryDetail (Task 3) y ComponentForm (Task 5).

**Diseño:**
- Props: `value: string | null`, `onChange: (locationId: string | null) => void`
- Estado cerrado: muestra nombre de ubicación seleccionada (o "Sin ubicación") + chevron
- Click → despliega dropdown con árbol de ubicaciones (reutiliza `buildTree()` de LocationTree)
- Cada nodo clickeable → selecciona, cierra dropdown
- Opción "Sin ubicación" al inicio para deseleccionar
- Fetch de ubicaciones en `useEffect` via Supabase browser client

- [ ] **Step 1:** Crear `LocationPicker.tsx` con fetch de ubicaciones y dropdown

- [ ] **Step 2:** Implementar árbol jerárquico en el dropdown (reutilizar lógica de `buildTree`)

- [ ] **Step 3:** Verificar selección y deselección

- [ ] **Step 4:** Commit: `feat(components): add LocationPicker tree selector island`

---

## Task 5: ComponentForm — Agregar campos faltantes

**Files:**
- Modify: `src/components/islands/ComponentForm.tsx`

El form actual solo maneja: sku, name, category, platform, quantity, notes. Falta: connectivity_caps, technical_specs, location_id, datasheet_url.

**Cambios:**
- Agregar state para `caps`, `specs`, `locationId`, `datasheetUrl`
- Integrar `ConnectivityEditor` (Task 2) después del selector de plataforma
- Integrar `SpecsEditor` (Task 2) después de conectividad
- Integrar `LocationPicker` (Task 4) después de cantidad
- Agregar input para `datasheetUrl`
- Modificar `handleSubmit`:
  - Upsert a `components` ahora incluye `connectivity_caps: caps`, `technical_specs: specs`, `datasheet_url: datasheetUrl`
  - Insert a `stock` ahora incluye `location_id: locationId`
- Inicializar desde `prefill` prop (para edición desde IA scan)

- [ ] **Step 1:** Agregar states para caps, specs, locationId, datasheetUrl

- [ ] **Step 2:** Renderizar ConnectivityEditor, SpecsEditor, LocationPicker, input datasheet en el form

- [ ] **Step 3:** Actualizar handleSubmit para incluir todos los campos nuevos

- [ ] **Step 4:** Verificar que prefill desde CameraCapture sigue funcionando

- [ ] **Step 5:** Commit: `feat(form): add connectivity, specs, location and datasheet fields`

---

## Task 6: LocationTree — Sub-ubicaciones y conteo

**Files:**
- Modify: `src/components/islands/LocationTree.tsx`

Actualmente solo crea ubicaciones raíz (parent_id = null) y no muestra conteo de componentes.

**Cambios:**
- **Crear sub-ubicación:** Agregar botón "+" en cada TreeNode que muestra form inline con parent_id preset
  - Nuevo state en TreeNode: `showNewChild`
  - Form similar al de raíz pero insert con `parent_id: loc.id`
- **Conteo de componentes:** Agregar prop `stockCounts: Record<string, number>` (location_id → count)
  - El page padre (`locations/index.astro`) hace un query count agrupado y pasa el resultado
  - TreeNode muestra badge `text-xs text-slate-400` con "N piezas" a la derecha

**No implementar** edit/delete aquí — eso va en LocationManager (Task 7).

- [ ] **Step 1:** Agregar prop `stockCounts` y mostrar badge de conteo en cada TreeNode

- [ ] **Step 2:** Modificar `locations/index.astro` para hacer el query de conteo y pasarlo como prop

- [ ] **Step 3:** Agregar botón "+" en TreeNode para crear sub-ubicación con parent_id

- [ ] **Step 4:** Verificar que sub-ubicaciones aparecen anidadas en el árbol

- [ ] **Step 5:** Commit: `feat(locations): add sub-location creation and component counts`

---

## Task 7: LocationManager — Editar, eliminar ubicación

**Files:**
- Create: `src/components/islands/LocationManager.tsx`
- Modify: `src/pages/locations/[id].astro`

El detalle de ubicación (`/locations/[id]`) muestra el QR y los componentes pero no permite gestionar la ubicación.

### LocationManager island
- Props: `location: { id, name, qr_code, parent_id }`, `onDeleted: () => void`
- **Editar nombre:** Input inline editable (click en nombre → input, blur/enter → save)
  - `supabase.from('locations').update({ name }).eq('id', locationId)`
- **Eliminar:** Botón "Eliminar ubicación" rojo → dialog confirmación → delete
  - `supabase.from('locations').delete().eq('id', locationId)`
  - Si tiene stock: alertar "Esta ubicación tiene N componentes que quedarán sin ubicación"
  - On success: redirect a `/locations`

### Cambios en `locations/[id].astro`
- Agregar `LocationManager` island con los datos de la ubicación
- Agregar sección de sub-ubicaciones (query children de esta ubicación)
- Usar layout `AppLayout` con slots topbar/desktop-main (actualmente solo usa mobile layout)

- [ ] **Step 1:** Crear `LocationManager.tsx` con edición de nombre inline

- [ ] **Step 2:** Agregar botón eliminar con confirmación y verificación de stock

- [ ] **Step 3:** Actualizar `locations/[id].astro` — agregar island + sub-ubicaciones + desktop layout

- [ ] **Step 4:** Verificar: editar nombre, eliminar vacía, eliminar con stock (warning)

- [ ] **Step 5:** Commit: `feat(locations): add edit name and delete with stock warning`

---

## Task 8: Connectivity en mobile inventory cards

**Files:**
- Modify: `src/components/islands/InventorySearch.tsx` (creado en Task 1)

El mockup muestra connectivity_caps en las cards móviles del inventario pero la implementación actual no lo hace.

**Cambio:** En el render de cada card dentro de InventorySearch, agregar después de la línea de categoría:

```tsx
{activeCaps.length > 0 && (
  <div className="flex gap-1 mt-0.5 flex-wrap">
    {activeCaps.slice(0, 3).map(cap => (
      <span key={cap} className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
        {cap}
      </span>
    ))}
    {activeCaps.length > 3 && (
      <span className="text-[10px] text-slate-400">+{activeCaps.length - 3}</span>
    )}
  </div>
)}
```

Mostrar max 3 caps + "+N" para evitar overflow en cards compactas.

- [ ] **Step 1:** Agregar connectivity_caps al render de cards móviles en InventorySearch

- [ ] **Step 2:** Verificar que no rompe el layout con componentes que tienen 0, 1-3, y 4+ caps

- [ ] **Step 3:** Commit: `feat(inventory): show connectivity badges on mobile cards`

---

## Orden de ejecución

```
Paralelo:
  Task 1 (InventorySearch) — sin dependencias
  Task 2 (ConnectivityEditor + SpecsEditor) — sin dependencias
  Task 4 (LocationPicker) — sin dependencias
  Task 6 (LocationTree sub-locations) — sin dependencias
  Task 7 (LocationManager) — sin dependencias
    ↓
Secuencial (dependen de los anteriores):
  Task 3a (InventoryDetail vista + delete) — sin dependencias de otros tasks
  Task 5 (ComponentForm campos) — depende de Tasks 2, 4
  Task 8 (Connectivity mobile) — depende de Task 1
    ↓
  Task 3b (InventoryDetail edición) — depende de Tasks 2, 4
```

**Paralelización posible:** Tasks 1, 2, 4, 6, 7 pueden ejecutarse en paralelo. Task 3a también es independiente pero se recomienda hacerla después de Task 2 para reutilizar los editores.

---

## Resumen de entregables

| # | Entregable | Spec ref |
|---|-----------|----------|
| 1 | Búsqueda y filtros interactivos en inventario | 3.1 |
| 2 | Editores de connectivity_caps y technical_specs reutilizables | 3.1 |
| 3a | Vista detalle como island + eliminar del inventario | 3.1 |
| 3b | Edición inline de todos los campos en detalle | 3.1 |
| 4 | Selector de ubicación en árbol | 3.1 / 3.3 |
| 5 | ComponentForm con todos los campos del spec | 3.1 |
| 6 | Sub-ubicaciones y conteo en árbol | 3.3 |
| 7 | Editar/eliminar ubicaciones | 3.3 |
| 8 | Connectivity badges en cards móviles | 3.1 (mockup screen-1) |

Al completar este sprint, el usuario podrá:
- Buscar y filtrar su inventario por texto y categoría
- Ver y editar todos los campos de un componente (incluyendo conectividad y specs)
- Eliminar componentes de su inventario
- Crear ubicaciones jerárquicas (raíz y sub-ubicaciones)
- Editar y eliminar ubicaciones
- Asignar ubicación al crear o editar un componente
- Ver cuántos componentes hay en cada ubicación del árbol
- Escanear QR → ver contenido de ubicación (ya funciona, este sprint lo complementa)
