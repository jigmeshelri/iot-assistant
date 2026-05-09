# IoT Assistant — Development Standards

## Stack

**Web app** (este repo, deploy a Vercel): Astro 6 + React 19 (Islands) + Tailwind 4 + Supabase (PostgreSQL + RLS) + Vitest + Playwright.

**Servicio auxiliar `api/`** (deploy a Railway): servicio Python que expone el agente conversacional consumido desde la web app para responder preguntas sobre el inventario y los proyectos del usuario.

## Documentación Clave

- `FUNCTIONAL_SPEC.md` — PRD con acceptance criteria (priorización MoSCoW)
- `TECHNICAL_SPEC.md` — Schema de DB, arquitectura del sistema, stack completo
- `supabase/schema.sql` — Source of truth del schema de base de datos

## Estructura del Proyecto

```
src/
  components/islands/  → React islands (interactivos, hidratados con client:*)
  components/ui/       → Componentes Astro estáticos (sin JS por defecto)
  lib/                 → Lógica de negocio y acceso a datos (abstracción sobre Supabase)
  pages/               → Rutas Astro
  layouts/             → Layouts Astro compartidos
  styles/              → Tailwind v4 globals (@theme tokens)
  test/                → Unit tests Vitest
  middleware.ts        → Astro middleware (auth/session)
e2e/
  ui/                  → Playwright specs
  fixtures/            → Seed data para E2E (seeded-test.ts)
  helpers/             → Helpers compartidos para specs
supabase/
  schema.sql           → Schema de DB (source of truth)
  migrations/          → Migraciones SQL
api/                   → Servicio Python (Railway) — agente conversacional
mockups/               → Mockups del proyecto, publicados via GitHub Pages
docs/                  → Proposals activos y archive de planes/specs completados
```

## TDD Estricto

Todo código nuevo sigue Red → Green → Refactor. Sin excepciones.

1. **Red**: Escribir test que falle describiendo el comportamiento esperado
2. **Green**: Código MÍNIMO para que pase
3. **Refactor**: Limpiar sin cambiar comportamiento

No se escribe código de producción sin un test que lo motive. Los tests son la especificación ejecutable.

- Unit/lógica: Vitest
- Componentes React: Testing Library + Vitest
- Flujos E2E: Playwright

## SOLID (enfoque selectivo)

- **SRP**: Un componente/función/módulo = una razón para cambiar. Islands no mezclan fetching + lógica + presentación.
- **DIP**: Islands y pages dependen de abstracciones en `src/lib/`, nunca de Supabase client directo. Esto permite testear sin DB real.

Los demás principios SOLID se aplican solo cuando el contexto lo justifica.

## KISS

- La solución más simple que funciona es la correcta.
- No agregar abstracciones, helpers ni capas sin necesidad concreta.
- No diseñar para requisitos hipotéticos futuros.
- Tres líneas similares > una abstracción prematura.

## Definition of Done

- **Bug fix**: test que reproduce el bug (RED) → fix mínimo (GREEN) → tests pasan → commit
- **Feature**: unit tests + implementación + E2E si hay AC en FUNCTIONAL_SPEC → commit
- **Refactor**: tests existentes siguen pasando sin modificación → commit
- **Cualquier tarea**: correr `npx vitest run` antes de declarar victoria

## Commits

Los commits siguen SRP: cada commit cuenta UNA parte de la historia del trabajo.

- Formato: [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): descripción`
- Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`
- Un commit por unidad lógica de cambio. NO acumular trabajo de múltiples tareas en un solo commit.
- **Regla para agentes**: al terminar una tarea, hacer commit ANTES de pasar a la siguiente. La historia del repo debe reflejar el progreso paso a paso.
- Nunca commitear: `.env`, `coverage/`, `node_modules/`, archivos con secretos.

## Branching & Review

El repo usa flujo **gitflow** con dos branches protegidas: `main` (estable, source of truth) y `develop` (integración).

### Reglas de branches

- **Siempre desde branch nueva**: nunca commitear directo a `main` ni a `develop`. Toda tarea (feat, fix, chore, refactor, docs, test) arranca creando una branch nueva desde `develop`.
- **Naming convention**: `<user>/<type>/<kebab-name>`
  - `<user>` — `sergio` o `claudio` (en minúscula)
  - `<type>` — uno de `feat | fix | chore | refactor | docs | test`
  - `<kebab-name>` — descripción corta en kebab-case, sin fecha (la fecha vive en `git log` y en el PR)
  - Ejemplos: `sergio/feat/email-notifications`, `claudio/fix/location-picker-render`, `sergio/docs/branching-and-review-policy`

### Flujo de integración

1. Branch de trabajo se corta de `develop`.
2. PR de la branch de trabajo → `develop`.
3. Review de SD o CJ — **el autor del PR no puede aprobar su propio PR** (regla built-in de GitHub).
4. Merge a `develop` cuando hay 1 approval.
5. Cuando `develop` está lista para release, PR de `develop` → `main` (también requiere 1 approval).

### Branch protection (server-side enforced)

Tanto `main` como `develop` están protegidas via GitHub branch protection con:

- ✅ Required pull request before merging (no se puede push directo)
- ✅ Required approvals: 1 (no del autor)
- ✅ Restrict force pushes
- ✅ Restrict deletions
- ✅ Include administrators (aplica a todos, sin excepción para admins)

Esto significa que **`git push origin main` directo va a ser rechazado por GitHub**, incluso para SD como admin. La única vía para llegar a `main` o `develop` es via PR aprobado.

### Áreas que merecen review más detenido

Todos los PRs requieren la misma approval, pero estas áreas justifican revisar con más cuidado por su impacto:

| Área | Por qué |
|---|---|
| `supabase/migrations/*.sql`, `supabase/schema.sql` | Cambios de DB compartida + RLS |
| `src/lib/auth*`, `src/lib/supabase.ts` | Auth y session management |
| `src/lib/inventory.ts`, `src/lib/locations.ts`, `src/lib/projects.ts` | Lógica de negocio core |
| `CLAUDE.md`, `FUNCTIONAL_SPEC.md`, `TECHNICAL_SPEC.md` | Convenciones y specs canónicos |

## Task Intake

Antes de empezar una tarea, verificar que el prompt incluye estos elementos. Si falta alguno, PREGUNTAR antes de escribir código:

1. **Contexto** — ¿Qué motivó la tarea? (bug report, issue, observación del usuario)
2. **Alcance** — ¿Qué archivos/componentes/módulos se ven afectados? ¿Qué NO debe tocarse?
3. **Criterio de éxito** — ¿Cómo se verifica que está listo? (test que pasa, comportamiento esperado)
4. **Tamaño** — ¿Es una tarea atómica o necesita planificación (SDD)?

Si el prompt es ambiguo en alguno de estos puntos, preguntar UNA VEZ con las dudas agrupadas. No asumir.

## Convenciones

- Tests van en `src/test/` (unit) y `e2e/` (Playwright)
- Lógica de negocio y acceso a datos en `src/lib/`
- React islands en `src/components/islands/`
- UI Astro en `src/components/ui/`
