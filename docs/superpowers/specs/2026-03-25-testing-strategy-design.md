# Testing Strategy — IoT Assistant

**Versión:** 1.0
**Fecha:** 2026-03-25

---

## Objetivo

Establecer una estrategia de testing por capas que garantice confianza tanto en la calidad del código (unit tests, 80% coverage) como en la funcionalidad completa del producto (E2E tests, 100% de flujos funcionales cubiertos).

## Arquitectura de tests

| Capa | Herramienta | Qué prueba | Target |
|---|---|---|---|
| **Unit** | Vitest + React Testing Library | Lógica de islands y utilidades | 80% line coverage en `src/lib/` + `src/components/islands/` |
| **E2E funcional** | Playwright | Cada flujo de la spec funcional | 100% de acceptance criteria |
| **E2E visual** | Playwright screenshots | Regresión visual en páginas clave | Mantener existente |

**Lo que NO se testea con unit tests:** páginas Astro (`.astro`). Son server-rendered templates con mínima lógica — se cubren vía E2E.

**Lo que NO se testea con E2E:** lógica interna de componentes (filtrado, cálculo de SKU, parsing). Eso es unit.

## Trazabilidad Spec → Test

Cada módulo de `FUNCTIONAL_SPEC.md` (3.1-3.7 + §4) tiene una sección **"Criterios de aceptación"** con IDs estables (`AC-X.Y.Z`). Los E2E tests referencian directamente estos IDs:

```typescript
test('AC-3.1.2: search filters inventory by name', async ({ page }) => { ... })
```

## Estado actual

- **Unit tests:** 30 casos, 18 passing, 12 failing (mock de LocationPicker roto)
- **E2E tests:** 38 funcionales + 7 visuales. Cubren 5 de 15 páginas.
- **Coverage:** Sin configurar.
- **Bloqueante:** LocationPicker.tsx rompe tests de ComponentForm y CameraCapture.

## Roadmap

### Paso 0 — Fix + configuración (bloqueante)

1. Arreglar mock de LocationPicker en tests existentes
2. Agregar `@vitest/coverage-v8` a vitest.config.ts
3. Verificar que los 30 tests pasan

### Fase 1 — E2E Auth + Inventario CRUD

| AC | Test | Spec |
|---|---|---|
| AC-4.1 | Login muestra formulario auth, redirect post-login | §4 |
| AC-3.1.1 | Crear componente manual → visible en lista | 3.1 |
| AC-3.1.2 | Buscar por texto → lista filtra en tiempo real | 3.1 |
| AC-3.1.3 | Ver detalle → specs, conectividad, ubicación, stock | 3.1 |
| AC-3.1.4 | Editar inline → cambios persisten al recargar | 3.1 |
| AC-3.1.5 | Eliminar → desaparece de lista | 3.1 |
| AC-3.1.6 | Filtrar por categoría → muestra solo esa categoría | 3.1 |
| AC-3.1.7 | Asignar ubicación → componente aparece en esa ubicación | 3.1 |
| AC-3.1.8 | Ajustar cantidad con +/− → stock actualizado | 3.1 |
| AC-4.2 | Un usuario no puede ver datos de otro (RLS) | §4 |
| AC-4.3 | Login ofrece OAuth + magic link | §4 |

### Fase 2 — E2E Ubicaciones + Proyectos

| AC | Test | Spec |
|---|---|---|
| AC-3.3.1 | Crear ubicación raíz → aparece en árbol | 3.3 |
| AC-3.3.2 | Crear sub-ubicación → aparece anidada bajo padre | 3.3 |
| AC-3.3.3 | Ver detalle ubicación → muestra componentes contenidos | 3.3 |
| AC-3.3.4 | Editar nombre + eliminar ubicación | 3.3 |
| AC-3.3.5 | Eliminar ubicación con componentes → warning + orphanizar | 3.3 |
| AC-3.3.6 | Conteo de componentes visible en cada nodo del árbol | 3.3 |
| AC-3.4.1 | Generar QR → muestra imagen + botón descargar/imprimir | 3.4 |
| AC-3.4.2 | URL de QR redirige a detalle de ubicación | 3.4 |
| AC-3.6.1 | Crear proyecto manual con tipo y dificultad | 3.6.1 |
| AC-3.6.2 | Transiciones de estado: guardado → en curso → completado | 3.6.1 |
| AC-3.6.3 | Añadir entrada de bitácora con tag y contenido | 3.6.2 |
| AC-3.6.4 | Agregar/editar/eliminar items de BOM | 3.6 |
| AC-3.6.5 | Editar título y descripción del proyecto inline | 3.6 |
| AC-3.6.6 | Agregar componente a BOM → aparece en tabla | 3.6 |
| AC-3.6.7 | Editar cantidad de item BOM → persiste | 3.6 |
| AC-3.6.8 | Eliminar item de BOM → desaparece | 3.6 |

### Fase 3 — E2E IA + Comunidad

| AC | Test | Spec |
|---|---|---|
| AC-3.2.1 | Subir foto → IA identifica → formulario pre-rellenado | 3.2 |
| AC-3.2.2 | Baja confianza → aviso de confirmación explícita | 3.2 |
| AC-3.2.3 | Corregir campos sugeridos por IA antes de guardar | 3.2 |
| AC-3.2.4 | Imagen original se almacena como referencia | 3.2 |
| AC-3.5.1 | Discover → muestra sugerencias con viabilidad y BOM | 3.5.1 |
| AC-3.5.2 | BOM sugerida muestra estados (disponible/parcial/faltante/incompatible) | 3.5.1 |
| AC-3.5.3 | Guardar sugerencia → crea proyecto en estado Guardado | 3.5 |
| AC-3.5.4 | Plan → describir idea → propuesta con BOM y dificultad | 3.5.2 |
| AC-3.5.5 | Refinamiento guiado → controlador, dificultad, restricciones | 3.5.2 |
| AC-3.5.6 | Guardar propuesta → proyecto con source "ai_plan" | 3.5.2 |
| AC-3.6.9 | Marcar componente como consumido → stock descontado | 3.6.3 |
| AC-3.6.10 | Componente no en inventario → badge "Falta", botón deshabilitado | 3.6.3 |
| AC-3.6.11 | Revertir consumo → stock restaurado | 3.6.3 |
| AC-3.6.12 | Publicar proyecto completado → visible en comunidad | 3.6.4 |
| AC-3.6.13 | Seleccionar entradas de bitácora para versión pública | 3.6.4 |
| AC-3.6.14 | Fork → copia en lista personal, incrementa contador | 3.6.4 |
| AC-3.6.15 | Comentar en proyecto público | 3.6.4 |
| AC-3.6.16 | Despublicar → desaparece de comunidad | 3.6.4 |
| AC-3.6.17 | Datos privados (cantidades, ubicaciones) no visibles en versión pública | 3.6.4 |
| AC-3.7.1 | Generar código → selector entorno → código mostrado | 3.7.1 |
| AC-3.7.2 | Descargar código con extensión correcta (.ino, .cpp, .py, .yaml) | 3.7.1 |
| AC-3.7.3 | Entorno sugerido corresponde al tipo de proyecto | 3.7.1 |
| AC-3.7.4 | Analizar código → mejoras sugeridas con tipo y explicación | 3.7.2 |
| AC-3.7.5 | Cada mejora indica tipo (rendimiento, bug, estilo) | 3.7.2 |
| AC-4.4 | Reconocimiento IA responde en < 10 segundos | §4 |

### Unit tests — Prioridad por impacto

| Prioridad | Componente/Lib | Tests clave |
|---|---|---|
| P0 | Fix mock LocationPicker | Desbloquea 12 tests |
| P0 | vitest.config.ts coverage | Agregar @vitest/coverage-v8 |
| P1 | InventorySearch | Filtrado por query, por categoría, empty state, connectivity display |
| P1 | InventoryDetail | Modo vista, modo edición, delete, save |
| P1 | BOMTable | Add/edit/delete items, read-only mode |
| P2 | LocationTree | Build tree, expand/collapse, create sub-location |
| P2 | LocationPicker | Open/close, select/deselect, loading, empty |
| P2 | ProjectHeader | Edit title, status transitions, delete |
| P2 | StockConsumption | Consume, undo, stock matching |
| P3 | ConnectivityEditor | Toggle on/off |
| P3 | SpecsEditor | Add/remove/edit pairs |
| P3 | ProjectFilters | Filter by status tabs |
| P3 | PublishProject | Publish flow, log selection, despublicar |
| P3 | LogTimeline | Add entry, display entries, tag selection |
| P3 | api.ts | apiFetch error handling, qrImageUrl |

## Requisitos no funcionales (§4) en tests

| Requisito | Cómo se verifica |
|---|---|
| Multi-usuario (RLS) | E2E: un usuario no ve datos de otro (requiere 2 test users) |
| PWA | Manual: verificar manifest + service worker registration |
| Rendimiento IA < 10s | E2E: timeout de 10s en test de reconocimiento |
| Autenticación | E2E: rutas protegidas redirigen a login |
| Privacidad imágenes | Unit: verificar que URLs de Storage son signed/privadas |
