# IoT Assistant — Development Standards

## Stack

Astro 6 + React 19 (Islands) + Tailwind 4 + Supabase (PostgreSQL + RLS) + Vitest + Playwright

## Documentación Clave

- `FUNCTIONAL_SPEC.md` — PRD con acceptance criteria (45 ACs, priorización MoSCoW)
- `TECHNICAL_SPEC.md` — Schema de DB, arquitectura del sistema, stack completo
- `supabase/schema.sql` — Source of truth del schema de base de datos

## Estructura del Proyecto

```
src/
  components/islands/  → React islands (25 componentes interactivos)
  components/ui/       → Astro components (5 componentes estáticos)
  lib/                 → Lógica de negocio y acceso a datos (13 módulos)
  pages/               → Rutas Astro (17 páginas)
  test/                → Unit tests Vitest (39 archivos)
e2e/
  ui/                  → Playwright specs (29 archivos)
  fixtures/            → Seed data para E2E (seeded-test.ts)
supabase/
  schema.sql           → Schema de DB (source of truth)
  migrations/          → Migraciones SQL
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
