# Sprint 2: Proyectos, Comunidad y Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Completar el ciclo de vida de proyectos (crear → trackear → publicar) y la interacción comunitaria para que el producto sea demostrable end-to-end.

**Architecture:** React islands sobre Astro pages. Mutaciones vía Supabase browser client. FastAPI ya funcional para IA (no requiere cambios backend).

**Tech Stack:** Astro 6, React 19, Supabase JS v2, Tailwind CSS 4

---

## Tasks

### Task 1: ProjectHeader — Editar título/descripción + estado + eliminar

**Files:**
- Create: `src/components/islands/ProjectHeader.tsx`
- Modify: `src/pages/projects/[id].astro`

Island que reemplaza el header estático del proyecto con funcionalidad interactiva.

**Features:**
- Editar título inline (click → input, blur/enter → save)
- Editar descripción inline (click → textarea, blur → save)
- Selector de estado: dropdown con opciones según estado actual:
  - saved → [Iniciar (in_progress)]
  - in_progress → [Pausar, Completar, Abandonar]
  - paused → [Reanudar (in_progress), Abandonar]
  - completed/abandoned → read-only
- Badge de tipo (DIY/Prototipo/Profesional) + badge de dificultad
- Barra de progreso editable (click → input range 0-100)
- Botón eliminar → confirm → `supabase.from('projects').delete()` → redirect `/projects`
- Botón publicar (si completed): toggle `is_public` → confirm → update

**Save:** `supabase.from('projects').update({title, description, status, progress, is_public}).eq('id', projectId)`

---

### Task 2: BOM Management — Agregar, editar, eliminar items

**Files:**
- Modify: `src/components/islands/BOMTable.tsx`

Transformar BOMTable de read-only a editable.

**Features:**
- Botón "+ Componente" que agrega una fila editable
- Input de nombre + input de cantidad + botón guardar por fila
- Botón eliminar por fila (× icon)
- Estado de cada item: badge automático según si el componente existe en stock del usuario
  - Esto requiere que BOMTable reciba `userStock` como prop para cross-reference
- Insert: `supabase.from('project_bom').insert({project_id, component_name, quantity_required})`
- Update: `supabase.from('project_bom').update({quantity_required, notes}).eq('id', bomId)`
- Delete: `supabase.from('project_bom').delete().eq('id', bomId)`

---

### Task 3: Stock Consumption — Marcar componentes como usados

**Files:**
- Create: `src/components/islands/StockConsumption.tsx`
- Modify: `src/pages/projects/[id].astro`

Island que muestra la BOM con controles para consumir stock.

**Features:**
- Recibe BOM items + user stock como props
- Cada item BOM:
  - Cross-reference con stock del usuario por `component_name` o `component_id`
  - Si hay stock match → botón "Usar" que:
    1. Insert en `project_consumed_stock` (project_id, stock_id, quantity)
    2. Update `stock` set quantity = quantity - consumed
  - Si ya consumido → badge verde "Usado" + botón "↩ Deshacer"
  - Si no hay stock → badge amber "Falta"
- Query consumed: `supabase.from('project_consumed_stock').select('*').eq('project_id', projectId)`

---

### Task 4: Publicar proyecto — Flujo completo

**Files:**
- Create: `src/components/islands/PublishProject.tsx`
- Modify: `src/pages/projects/[id].astro`

Botón + modal/panel para publicar un proyecto a la comunidad.

**Features:**
- Botón "Publicar en comunidad" (solo visible si status=completed y is_public=false)
- Al click → expande panel con:
  - Input título público (pre-rellenado)
  - Textarea descripción pública
  - Selector de dificultad
  - Tags editables (chips + añadir)
  - Checkbox de entradas de bitácora a incluir (lista con toggle)
  - Preview de cómo se verá
- Botón "Publicar" → update proyecto `is_public: true` + campos editados
- Botón "Despublicar" si ya es público

---

### Task 5: Community detail — Mejorar vista pública

**Files:**
- Modify: `src/pages/community/[id].astro`

Agregar lo que falta en la vista pública de un proyecto.

**Features:**
- Avatar y nombre del autor (query user profile o fallback a email)
- Fecha de creación
- Badge de dificultad + tipo
- Bitácora pública (log entries con is_public=true)
- Code resources públicos
- Tags del proyecto
- Mejorar layout responsive (desktop: 2 columnas proyecto+comments)

---

### Task 6: Project creation improvements

**Files:**
- Modify: `src/pages/projects/index.astro`
- Create: `src/pages/projects/new.astro`

**Features:**
- Página `/projects/new` con formulario manual de proyecto:
  - Título, descripción, tipo (DIY/Prototipo/Profesional), dificultad
  - Estado inicial: "saved"
  - Redirect a `/projects/[id]` on save
- Botón "Nuevo proyecto" en project list apunta a `/projects/new`
- Filtros de estado en la lista (tabs: Todos / Activos / Completados / Archivados)

---

## Orden de ejecución

```
Paralelo:
  Task 1 (ProjectHeader) — independiente
  Task 2 (BOM Management) — independiente
  Task 6 (Project creation) — independiente
    ↓
  Task 3 (Stock Consumption) — depende de Task 2 (BOM editable)
  Task 4 (Publicar proyecto) — depende de Task 1 (status management)
  Task 5 (Community detail) — independiente
```
