# Archivo: planes y specs de Superpowers

Trabajo de planificación generado durante el desarrollo del MVP (2026-03-22 → 2026-04-05) usando el flujo de skills de Superpowers (`brainstorming` → `writing-plans` → `executing-plans` / `subagent-driven-development`).

Todos los planes y specs listados acá fueron **ejecutados y mergeados a `main`**. Se conservan como referencia histórica para entender decisiones de diseño y trazabilidad de features. **No son trabajo activo** — para nuevas iteraciones, generar un plan nuevo en `docs/plans/` (o donde se decida) y dejar este árbol intacto.

> **Nota sobre los checkboxes**: los archivos contienen listas con `- [ ]` que **nunca se marcaron** como `- [x]` durante la ejecución. La verificación de completitud se hizo cruzando contra PRs mergeados y código en `main`, no contra el estado de los checkboxes. Aprendizaje: si un plan futuro usa checklist, hay que actualizarlo durante la ejecución; de lo contrario, omitir el tracking.

---

## Planes (`plans/`)

| Archivo | Tema | Evidencia de cierre |
|---|---|---|
| `2026-03-22-code-resources.md` | CodeResources island con persistencia versionada (`version`, `parent_id`) y endpoint `/ai/code/analyze` | PR #5 + commits sobre `CodeResource`; `e7c0525` upgrade E2E code generation |
| `2026-03-22-sku-autogeneration.md` | SKU opcional con autogeneración por categoría en `ComponentForm` y `CameraCapture` | `src/lib/skuUtils.ts` + `src/test/skuUtils.test.ts`; commits `82294af`, `a2a9d9d` |
| `2026-03-24-mockups-faltantes.md` | Completar screens 6–17 en `mockups/index.html` | 19 botones `showScreen()` activos en `mockups/index.html` |
| `2026-03-24-sprint1-inventory-locations-qr.md` | CRUD de inventario, ubicaciones y escaneo QR | PRs #5, #11; specs E2E `e2e/ui/*.spec.ts` |
| `2026-03-24-sprint2-projects-community.md` | ProjectHeader interactivo, publicar/despublicar, comments | PRs #11, #12; commits `fc214ce`, `7d29cb1` |
| `2026-03-25-mvp-test-completion.md` | Tests RLS, middleware, skuUtils para cerrar gaps de AC | PRs #3, #5, #11 |
| `2026-03-25-testing-implementation.md` | Coverage Vitest 80% + Playwright para todos los AC | Suite actual: tests Vitest en `src/test/` + specs en `e2e/ui/` |
| `2026-04-01-issues-13-16-ux-fixes.md` | UX fixes para issues #13, #14, #15, #16 | PR #17 |
| `2026-04-05-responsive-bottom-nav.md` | Bottom nav responsive con overflow sheet | PR #23 |

## Specs (`specs/`)

| Archivo | Plan asociado | Estado |
|---|---|---|
| `2026-03-22-code-resources-sku-design.md` | code-resources + sku-autogeneration | Implementado |
| `2026-03-25-testing-strategy-design.md` | testing-implementation + mvp-test-completion | Implementado |
| `2026-04-05-responsive-bottom-nav-design.md` | responsive-bottom-nav | Implementado |
