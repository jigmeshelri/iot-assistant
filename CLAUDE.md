# IoT Assistant — Development Standards

## Stack

Astro 6 + React 19 (Islands) + Tailwind 4 + Supabase (PostgreSQL + RLS) + Vitest + Playwright

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

## Commits

Los commits siguen SRP: cada commit cuenta UNA parte de la historia del trabajo.

- Formato: [Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): descripción`
- Types: `feat`, `fix`, `test`, `docs`, `chore`, `refactor`
- Un commit por unidad lógica de cambio. NO acumular trabajo de múltiples tareas en un solo commit.
- **Regla para agentes**: al terminar una tarea, hacer commit ANTES de pasar a la siguiente. La historia del repo debe reflejar el progreso paso a paso.
- Nunca commitear: `.env`, `coverage/`, `node_modules/`, archivos con secretos.

## Convenciones

- Tests van en `src/test/` (unit) y `e2e/` (Playwright)
- Lógica de negocio y acceso a datos en `src/lib/`
- React islands en `src/components/islands/`
- UI Astro en `src/components/ui/`
