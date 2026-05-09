---
type: proposal
project: iot-assistant
status: draft
date: 2026-05-09
author: SD
team: [SD, CJ]
tags: [documentacion, convenciones, claude-md, comparativa, plan-adopcion, trabajo-equipo]
related:
  - ../archive/superpowers/README.md
---

# Propuesta: convenciones de documentación para iot-assistant

> Reporte comparativo entre `iot-assistant`, `15cot` (workspace MCL Cotizadores) y `mcl-onetrust` + plan de adopción por fases. **Sin cambios de código** — esto es análisis y plan; la ejecución se decide al final.

## 1. Contexto

Tras archivar `docs/superpowers/` en commit `a6e1b13` (12 planes/specs históricos, todos completados), `iot-assistant` queda con un esqueleto documental bastante minimalista frente a `15cot` y `mcl-onetrust`, que tienen convenciones de documentación más maduras. Esta propuesta cruza las tres y produce un plan priorizado de qué adoptar acá, en qué orden y con qué esfuerzo.

**Filosofías observadas:**

- **`iot-assistant`** — minimalista pragmático. CLAUDE.md de 3.9k centrado en disciplina de desarrollo (TDD, SOLID selectivo, KISS, DoD, Task Intake). Specs grandes consolidados (`FUNCTIONAL_SPEC.md` 44k, `TECHNICAL_SPEC.md` 40k). Sin frontmatter, sin glosario, sin reading policy explícita.
- **`15cot`** — vault Obsidian-style. CLAUDE.md de 7.7k. **9 reglas de documentación atómicas** formalizadas en `reglas-documentacion/`, indexadas vía MOC. Frontmatter YAML en cada nota. Carpetas semánticas (`arquitectura/`, `diario/`, `mocs/`, `proyectos/`, `referencia/`).
- **`mcl-onetrust`** — lifecycle SDD/openspec con regen. CLAUDE.md de 8.9k con secciones formales (Reading policy, Glosario de dominio, Where to look by topic, Expected layout enforced by CI). `openspec/changes/` + `regen/X.Y.Z-beta/` por versión. Patrón cycle-by-cycle: `decision-bump-*`, `decision-rejection-*`, `lessons-*`, `followups-cycle-*`.

**Conclusión preliminar**: ninguno de los dos otros repos es "mejor" en abstracto. La pregunta correcta es **qué piezas de cada uno aportan valor real a `iot-assistant` dado su tamaño, ritmo y stack**.

**Contexto adicional (incorporado tras revisión inicial)**: a partir de esta sesión, **Claudio Jara (CJ) se incorpora al desarrollo de iot-assistant** junto con Sergio Donoso (SD). Esto convierte algunas convenciones que eran "nice to have" para un proyecto solo en **necesarias** para evitar fricción asincrónica entre dos personas (autoría, scratch personal separado, review policy, glosario de equipo). El **Apéndice B** (sección 9) detalla los items específicos que se agregan al plan original por este motivo. Las fases del §6 incorporan estas piezas inline.

---

## 2. Las 9 reglas de 15cot frente a iot-assistant

Extraídas de `15cot/reglas-documentacion/` y su MOC. La regla 9 es estructura plana y la 1 es kebab-case del filename. Aplico cada una a `iot-assistant`:

| # | Regla 15cot | Estado actual en iot-assistant | Aplicabilidad | Acción sugerida |
|---|---|---|---|---|
| 1 | `titulos-descriptivos-kebab-case` | Parcial. `FUNCTIONAL_SPEC.md` y `TECHNICAL_SPEC.md` violan (UPPERCASE_SNAKE). `docs/archive/superpowers/*` ya cumplen. | ✅ Adoptar | Formalizar regla en CLAUDE.md. **No renombrar legacy** (boy scout — solo en archivos nuevos o cuando se toquen por otra razón). |
| 2 | `frontmatter-yaml` | ❌ Ningún `.md` tiene frontmatter. | ⚠️ Selectiva | Adoptar para tipos recurrentes (proposals, decisions, lessons, followups). NO para README ni para los SPEC monolíticos — costo de retrofit alto sin valor inmediato. |
| 3 | `claude-md-raiz-vault` | ✅ Existe (3.9k) pero le faltan: glosario de dominio, reading policy, "where to look by topic". | ✅ Extender | Agregar secciones inspiradas en `mcl-onetrust` CLAUDE.md (ver §4). |
| 4 | `notas-atomicas-y-mocs` | ❌ Specs son monolíticos (44k + 40k). | ⚠️ NO aplicar a SPECs existentes | Los SPECs son producto trabajado, no scratch. **Aplicar atomicidad solo a docs nuevos** (decisions, lessons). MOCs no aplican todavía — el volumen de docs no lo justifica. |
| 5 | `wikilinks-enlaces-explicitos` | ❌ Usa `[texto](path)` markdown. | ⚠️ Adaptar el principio, no la sintaxis | iot-assistant **no es Obsidian vault**. PERO: el principio (mencionar X → enlazar X) sí aplica. Usar markdown links estándar, no `[[wikilinks]]`. Excepción: en frontmatter `related:` se pueden permitir wikilinks como en mcl-onetrust. |
| 6 | `plantillas-tipos-recurrentes` | ❌ No hay templates. | ✅ Cuando se establezcan tipos | Diferido a Fase 2 — primero definir qué tipos hay, después template. |
| 7 | `separar-durable-de-efimero` | ❌ No hay scratch versionado (lo que había se acabó de untrackear). | ⚠️ No aplica todavía | NO crear `diario/`. Si en el futuro aparece scratch versionado, aplicar la regla. Lo equivalente a esta regla acá es la **reading policy** del mcl-onetrust ("ignorar X salvo solicitud") — adoptar esa, no la carpeta `diario/`. |
| 8 | `evitar-ambiguedad-personal` | ✅ Implícitamente — los docs son técnicos, sin "M" o "ayer". | ✅ Formalizar | Una línea en CLAUDE.md ("nombres completos, fechas ISO, glosario para acrónimos"). Cero costo. |
| 9 | `estructura-carpetas-plana` | ✅ Cumple. `docs/`, `src/`, `e2e/`, `tests/`, `supabase/`, todo plano. | ✅ Mantener | Sin acción — ya cumplido. Validar que las nuevas carpetas (e.g. `docs/proposals/`, `docs/archive/`) respeten ≤ 3 niveles. |

**Veredicto sobre las 9 reglas**: 4 aplicables tal cual (1, 3, 8, 9), 4 con adaptación (2, 4, 5, 7), 1 diferida (6). Cero rechazadas en seco.

---

## 3. Lifecycle de versiones de mcl-onetrust frente a iot-assistant

`mcl-onetrust` tiene un patrón sofisticado por release/cycle:

- `docs/decision-bump-X.Y.Z-beta-YYYY-MM-DD.md` — alcance del cycle, riesgos, tradeoffs
- `docs/decision-rejection-X.Y.Z-beta-YYYY-MM-DD.md` — cuando un cycle falla en judgment-day
- `docs/lessons-X.Y.Z-beta.md` — post-mortem estructural
- `docs/followups-cycle-X.Y.Z-beta.md` — action items abiertos, heredados, cerrados
- `regen/X.Y.Z-beta/{accept,coverage}/` — artefactos de regen

Esto está pensado para .NET con CI/SonarQube/regen framework, modo `autonomous-full`, tags `specs-vX.Y.Z` y verdicts adversariales. Es un sistema **muy alto nivel de formalización** atado a un workflow específico (regenerative-development).

**Aplicabilidad a iot-assistant**:

- ❌ **Patrón completo**: sobreingeniería. iot-assistant no versiona formalmente (`package.json` 0.1.0, sin tags semver, sin regen, sin judgment-day).
- ✅ **Idea adaptada — `lessons.md` por aprendizaje grande**: cuando un PR/feature deja una lección estructural, capturarla en un archivo. NO uno por release; uno cuando vale la pena. Ejemplo de candidatos: el bug de checkboxes nunca marcados, la decisión de archivar superpowers, el patrón de testing E2E con seeded fixtures.
- ✅ **Idea adaptada — ADRs ligeros**: `docs/decisions/YYYY-MM-DD-decision-corta.md` con frontmatter `type: decision`. Cuando se toma una decisión arquitectónica que no es obvia desde el código (ej: "por qué Supabase y no X", "por qué Astro SSR y no SPA"). NO una por commit; **una cuando hay tradeoff explícito**.
- ❌ **`followups-cycle-*`**: no aplica. iot-assistant tiene GitHub Issues como tracker; no hace falta una capa más.

**Veredicto**: del lifecycle 1trust se adopta el espíritu (capturar decisiones y lecciones) pero **no la maquinaria** (cycles, bumps, rejections, judgment-day, followups files). En iot-assistant un `docs/decisions/` + `docs/lessons/` ligeros alcanzan.

---

## 4. Estructura del CLAUDE.md — comparativa

Cruzando las secciones de los tres CLAUDE.md (resumen):

| Sección | iot-assistant | 15cot | mcl-onetrust | Recomendación para iot-assistant |
|---|:---:|:---:|:---:|---|
| Project name + Purpose | ❌ | ❌ | ✅ | **Agregar** — una línea cada uno |
| Stack | ✅ | ✅ workspace | ✅ | Mantener |
| Estructura del proyecto | ✅ tabla | ❌ | ✅ | Mantener |
| Reading policy ("qué NO leer por defecto") | ❌ | ❌ | ✅ ⭐ | **Agregar** — la sección estrella de mcl-onetrust |
| Documentación clave (punteros) | ✅ | ❌ | indirecto | Mantener — extender con punteros a `docs/proposals/`, `docs/decisions/` cuando existan |
| Glosario de dominio | ❌ | ❌ | ✅ | **Agregar mínimo** — acrónimos del proyecto (BOM, SKU, RLS, IA, MVP, AC, etc.) |
| Where to look by topic | ❌ | ❌ | ✅ | **Agregar** — "para schema → supabase/schema.sql; para AC → FUNCTIONAL_SPEC.md; etc." |
| Idioms / language rules | ❌ explícito (en global) | ✅ | ❌ | Diferido — ya está en `~/.claude/CLAUDE.md` global |
| Convenciones de docs | ❌ | ❌ explícito | ✅ | **Agregar** — referenciar este archivo cuando esté aprobado |
| TDD / DoD / KISS / SOLID | ✅ ⭐ | ❌ | ❌ | Mantener — fortaleza única de iot-assistant |
| Task Intake | ✅ ⭐ | ❌ | ❌ | Mantener — fortaleza única |
| Commit convention | ✅ | ✅ | ❌ explícito | Mantener |
| Verification before claims | ❌ | ✅ | ❌ explícito | **Agregar línea corta** ("nunca marcar terminado sin demostrar") |
| Build & test discipline | ❌ explícito | ✅ | ✅ | Mantener implícito en DoD — no duplicar |
| Memory protocol | ❌ (en global) | ✅ explícito | ❌ | Diferido — está en global del user |

**Síntesis**: el CLAUDE.md actual de iot-assistant no es malo, es **incompleto en orientación al lector** (qué leer, qué NO leer, dónde buscar cada cosa). Las fortalezas únicas (TDD/DoD/Task Intake) hay que conservarlas. Lo que falta agregar son ~5 secciones cortas:

1. Project name + Purpose (3 líneas)
2. Reading policy (qué leer por defecto, qué ignorar)
3. Glosario de dominio (tabla de acrónimos)
4. Where to look by topic (tabla)
5. Verification before claims (1 línea)

Tamaño esperado post-extensión: ~6k (vs 3.9k actual).

---

## 5. SDD / openspec vs superpowers

**Lo que iot-assistant tenía**: workflow "superpowers" — plans en `docs/superpowers/plans/YYYY-MM-DD-*.md` con sección Goal + Architecture + Tech Stack + File Map + Tasks. Lo acabamos de archivar (12 archivos completados).

**Lo que mcl-onetrust usa**: openspec — `openspec/changes/<change-name>/{proposal.md, spec.md, design.md, tasks.md}`. Más formal, schema definido en `openspec/config.yaml`, soporte para "regenerative-development" framework.

**Lo que 15cot usa**: convencional — `proyectos/YYYY-MM-DD-nombre.md` para planes, `arquitectura/nombre.md` para ADRs. Sin schema formal.

**Aplicabilidad**:

- ❌ **openspec completo**: sobreingeniería para `iot-assistant`. Requiere skill orchestrator, manifest, regen, judgment-day. El proyecto no necesita ese nivel de formalización ahora.
- ❌ **superpowers de vuelta**: el mismo Sergio puede confirmar que los plans ya generados nunca actualizaron checkboxes durante ejecución. El template tenía un campo de tracking que el equipo no usó. Re-adoptarlo tal cual repite el problema.
- ✅ **Patrón 15cot ligero adaptado**: `docs/plans/YYYY-MM-DD-nombre.md` con frontmatter (`type: plan`, status: draft/in-progress/done) y **sin checkboxes** (el GitHub Issue/PR es el tracker; el plan describe el qué/por qué/cómo, no el progreso). Status del plan se actualiza al estado correspondiente cuando cambia.
- ✅ **`docs/decisions/` para ADRs ligeros**: cuando un cambio merece una nota explicando el por qué (no obvio desde el código), un ADR de 1 página. Frontmatter `type: decision`.

**Recomendación**: adoptar `docs/plans/` y `docs/decisions/` con frontmatter, pero **sin schema formal ni orchestrator**. El plan describe; el PR ejecuta. Si en 6 meses el volumen justifica formalizar (>20 plans concurrentes, varios autores, conflictos), evaluar openspec en serio.

---

## 6. Plan de adopción por fases

Cada fase es **commiteable de forma independiente**. La fase N no requiere que la N+1 esté hecha. Esto permite parar en cualquier punto y aún haber ganado valor.

### Fase 0 — Preparación (este archivo)

- [x] Archivar `docs/superpowers/` → `docs/archive/superpowers/` con README índice (commit `a6e1b13`).
- [x] Eliminar vestigios Jekyll (commit `33ad456`).
- [x] Untrack `.atl/`, `.remember/`, `.gga` + actualizar `.gitignore` (commit `2dd638c`).
- [x] Producir esta propuesta (`docs/proposals/2026-05-09-doc-conventions-adoption.md`).

### Fase 1 — Extender CLAUDE.md (low risk, high value)

**Esfuerzo**: 1 sesión corta. **Impacto**: alto — orienta a Claude y a humanos nuevos.

- [ ] Agregar sección **"Project name + Purpose"** (3-4 líneas).
- [ ] Agregar sección **"Team"** (NUEVO por incorporación de CJ):
  - SD — Sergio Donoso (repo owner)
  - CJ — Claudio Jara
  - Iniciales consistentes con `mcl-onetrust/CLAUDE.md` para no inventar vocabulario nuevo.
- [ ] Agregar sección **"Reading policy"**:
  - leer por defecto: `src/`, `supabase/`, `e2e/`, `tests/`, `docs/` (excepto `archive/` y carpetas personales), `CLAUDE.md`, `README.md`, `FUNCTIONAL_SPEC.md`, `TECHNICAL_SPEC.md`
  - NO leer por defecto: `docs/archive/`, `mockups/index.html` (excepto si se pregunta por mockups), `coverage/`, `dist/`, snapshots de Playwright, **carpetas personales (ver Apéndice B §9.1)**
- [ ] Agregar sección **"Glosario de dominio"** con tabla:
  - AC = Acceptance Criterion
  - BOM = Bill of Materials
  - SKU = Stock Keeping Unit
  - RLS = Row-Level Security (Supabase)
  - SSR = Server-Side Rendering
  - PWA = Progressive Web App
  - IA = Inteligencia Artificial (lo usado en español por el dominio)
  - MVP = Minimum Viable Product
- [ ] Agregar sección **"Where to look by topic"** con tabla:
  - Schema DB → `supabase/schema.sql`
  - Acceptance criteria → `FUNCTIONAL_SPEC.md`
  - Arquitectura del sistema → `TECHNICAL_SPEC.md`
  - Decisiones técnicas históricas → `docs/archive/superpowers/README.md` + `git log`
  - Convenciones de documentación → este archivo (cuando se apruebe)
- [ ] Agregar línea **"Verification before claims"** ("nunca marcar terminado sin demostrar — correr tests, leer logs, no asumir").
- [ ] Agregar sección **"Convenciones de documentación"** que referencie el archivo de reglas (Fase 2).
- [ ] (NUEVO por equipo) Agregar sección **"Code review policy"** mínima:
  - PRs en áreas críticas (`supabase/migrations/`, `src/lib/auth*`, RLS) requieren review del otro miembro
  - PRs cosméticos / refactors menores pueden self-merge (autonomía)
  - Decisión específica de qué cuenta como "área crítica" se ratifica entre SD y CJ antes de cerrar Fase 1

**Commit**: `docs(claude): extend with team, reading policy, glossary, where-to-look, and review policy`

### Fase 2 — Reglas de documentación + templates (medio esfuerzo, valor estructural)

**Esfuerzo**: 1-2 sesiones. **Impacto**: medio — formaliza convenciones que ya van a aplicar a docs nuevos.

- [ ] Crear `docs/rules/README.md` — índice tipo MOC con las reglas adoptadas (subset de las 9 de 15cot, adaptadas), ordenadas por impacto:
  1. `titulos-descriptivos-kebab-case.md`
  2. `frontmatter-yaml.md` (con vocabulario controlado para `type` y **`author` con iniciales `SD` / `CJ`** — NUEVO por equipo)
  3. `evitar-ambiguedad-personal.md` (incluyendo glosario de iniciales — NUEVO por equipo)
  4. `estructura-carpetas-plana.md`
  5. `enlaces-explicitos.md` (versión adaptada de wikilinks — usa markdown estándar)
- [ ] Vocabulario controlado de frontmatter (NUEVO con campo `author` por equipo):
  - `type`: `proposal | decision | plan | lesson | reference`
  - `project`: `iot-assistant` (constante)
  - `status`: `draft | proposed | accepted | rejected | superseded | done`
  - `date`: ISO `YYYY-MM-DD`
  - `author`: `SD | CJ` (NUEVO — iniciales)
  - `tags`: array kebab-case
  - `related`: array de paths o (en docs nuevos) wikilinks Obsidian-style
  - **Para `decision` agregar `approvers: [SD, CJ]`** — quién ratificó (NUEVO por equipo)
- [ ] Crear `docs/templates/`:
  - `template-proposal.md`
  - `template-decision.md` con campo `## Approvers` y `## Tradeoffs` (NUEVO inspirado en `mcl-onetrust`)
  - `template-plan.md` con campo `## Owner / Assigned to` (NUEVO por equipo)
  - `template-lesson.md`
- [ ] Actualizar CLAUDE.md sección "Convenciones de documentación" para referenciar `docs/rules/README.md`.

**Commit**: `docs: add documentation rules and templates`

### Fase 3 — Crear espacios para docs vivos (low esfuerzo, valor opcional)

**Esfuerzo**: minutos. **Impacto**: bajo en el corto plazo, alto si la práctica se mantiene.

- [ ] Crear `docs/plans/` con `README.md` mínimo apuntando al template.
- [ ] Crear `docs/decisions/` con `README.md` mínimo apuntando al template.
- [ ] (Opcional) `docs/lessons/` si en próximas sesiones surge una lección estructural que valga la pena capturar.
- [ ] (NUEVO por equipo) Crear carpetas personales según decisión de Apéndice B §9.1:
  - **Opción A**: `sergio/` y `claudio/` en root (patrón mcl-onetrust)
  - **Opción B**: `docs/personal/sergio/` y `docs/personal/claudio/` (más limpio, root sin contaminar)
  - **Opción C**: gitignored — son scratch puro, no se versionan
  - Default propuesto: **Opción B con cada carpeta personal versionada** — mantiene root limpio + permite asincronía visible. Ratificar en la sesión.

**Commit**: `docs: scaffold plans, decisions, and lessons directories`

### Fase 4 — Migración oportunista (boy scout, sin deadline)

**Esfuerzo**: bajo, distribuido. **Impacto**: gradual.

- [ ] Cuando se toque `FUNCTIONAL_SPEC.md` o `TECHNICAL_SPEC.md` por otra razón, considerar **partir secciones autocontenidas** a archivos atómicos en `docs/` (ej: `docs/architecture/auth-flow.md`). NO migración masiva.
- [ ] Cuando se cree un PR no trivial, considerar agregar una `docs/decisions/` si la decisión amerita.

Sin commit obligatorio — esta fase es continua.

---

## 7. Decisiones pendientes

Para que SD y CJ decidan antes de empezar a ejecutar:

1. **¿Path de este reporte?** ✅ Confirmado por SD: `docs/proposals/2026-05-09-doc-conventions-adoption.md`.
2. **¿Commit de esta propuesta?** Pendiente. Propuesta: commitear cuando CJ revise también.
3. **¿Vocabulario de `type` en frontmatter?** Propuesto: `proposal`, `decision`, `plan`, `lesson`, `reference`. Alternativa: traer el de 15cot tal cual y adaptar.
4. **¿`docs/rules/` con reglas atómicas (estilo 15cot) o todo embebido en `CLAUDE.md`?** Recomendación: separación porque escala mejor.
5. **¿Frontmatter en `FUNCTIONAL_SPEC.md` y `TECHNICAL_SPEC.md`?** Recomendación: NO retrofit. Solo en docs nuevos.
6. **¿Migrar `mockups/index.html` (376k)?** Out-of-scope; merece nota separada.
7. **(NUEVO por equipo) ¿Ubicación de carpetas personales?** Ver Apéndice B §9.1 — default Opción B (`docs/personal/<inicial>/` versionado).
8. **(NUEVO por equipo) ¿Qué cuenta como "área crítica" para review obligatorio?** Default propuesto: `supabase/migrations/`, `src/lib/auth*`, `src/lib/locations.ts`, `src/lib/inventory.ts` (cualquier path que altere RLS o lógica de negocio core). Ratificar entre SD y CJ.
9. **(NUEVO por equipo) ¿Iniciales de Claudio?** Propuesto: `CJ` (consistente con `mcl-onetrust/CLAUDE.md`). Confirmar con el propio CJ.

---

## 8. Apéndice A — Matriz consolidada

| Pieza analizada | iot-assistant tiene | Adoptar | Esfuerzo | Fase |
|---|---|---|---|---|
| Filename kebab-case | parcial | sí (formal, no retrofit) | bajo | 1 |
| Frontmatter YAML (con `author`) | no | sí (selectivo) | medio | 2 |
| CLAUDE.md raíz con secciones completas | parcial | sí (extender) | bajo | 1 |
| Notas atómicas | no (specs grandes) | parcial (solo nuevos) | bajo | 4 |
| MOCs | no | no (todavía) | — | — |
| Wikilinks Obsidian | no | no (markdown estándar) | — | — |
| Templates por tipo | no | sí | medio | 2 |
| Separar durable/efímero | n/a | adaptado a "reading policy" | bajo | 1 |
| Evitar ambigüedad | implícito | sí (formalizar) | bajo | 1 |
| Estructura plana | sí | mantener | — | 0 |
| Reading policy | no | sí | bajo | 1 |
| Glosario de dominio | no | sí | bajo | 1 |
| Where to look by topic | no | sí | bajo | 1 |
| Decisions con ADR ligero | no | sí (con `approvers`) | medio | 3 |
| Plans con frontmatter | parcial (archivado) | sí (con `owner`) | bajo | 3 |
| Lessons learned | no | opcional | bajo | 4 |
| **Team section en CLAUDE.md** (NUEVO) | no | **sí** | bajo | 1 |
| **Code review policy** (NUEVO) | no (informal) | **sí** | bajo | 1 |
| **Carpetas personales** (NUEVO) | no | **sí (Opción B default)** | bajo | 3 |
| **`author` en frontmatter** (NUEVO) | no | **sí** | bajo | 2 |
| **`approvers` en decisions** (NUEVO) | no | **sí** | bajo | 2 |
| openspec / regen / cycles | no | no (sobreingeniería) | — | — |
| Followups files | no | no (GitHub Issues) | — | — |

---

## 9. Apéndice B — Trabajo en equipo (SD + CJ): cambios e items adicionales

A partir de esta sesión, **Claudio Jara (CJ) se incorpora al desarrollo de iot-assistant**. Esta sección consolida los cambios al plan original que aparecen distribuidos en las fases. Si el documento se vuelve a refactorizar a futuro, este apéndice se folds back a las secciones principales.

### 9.1 Carpetas personales — qué son y dónde van

**Qué son**: scratch propio de cada miembro — análisis exploratorios, búsquedas de sentido sobre la documentación existente, drafts antes de promover a doc canónico, notas de pensamiento en voz alta. **No** son docs del proyecto; son notas de trabajo personal **versionadas** para que el otro miembro pueda leerlas si lo pide explícitamente.

Esto sigue el patrón de `mcl-onetrust` donde existen `/sergio`, `/claudio`, `/gonzalo` con la regla "**Efímero — ignorar salvo solicitud expresa**".

**Tres opciones de ubicación**:

| Opción | Path | Pro | Con |
|---|---|---|---|
| A | `sergio/` y `claudio/` en root | Visibilidad alta; consistente con `mcl-onetrust` | Contamina root, choca con regla "estructura plana ≤ 3 niveles" si crece |
| B (default) | `docs/personal/sergio/` y `docs/personal/claudio/` | Root limpio; agrupa todo lo personal en un subárbol | Un nivel más profundo; menos visible |
| C | `.scratch/sergio/` y `.scratch/claudio/` con todo gitignored | No contamina repo; cada uno usa lo suyo localmente | Pierde el beneficio de comunicación asincrónica visible |

**Recomendación default**: **Opción B versionado**. Mantiene la asincronía visible (CJ puede leer las notas de SD si lo necesita) sin ensuciar root. Si en práctica genera ruido, migrar a A o C.

**Reading policy implícita**: el CLAUDE.md de Fase 1 indica explícitamente "**ignorar `docs/personal/` salvo solicitud expresa**".

### 9.2 Iniciales y vocabulario de equipo

| Inicial | Persona | Rol |
|---|---|---|
| SD | Sergio Donoso | Repo owner; arquitectura + features |
| CJ | Claudio Jara | (rol a definir entre SD y CJ — features, review, áreas específicas) |

Iniciales consistentes con `mcl-onetrust` para no inventar vocabulario nuevo. **Confirmar con CJ** que está de acuerdo con `CJ` antes de codificarlo.

### 9.3 Frontmatter — campos que cambian por equipo

Vocabulario controlado actualizado:

```yaml
---
type: proposal | decision | plan | lesson | reference
project: iot-assistant
status: draft | proposed | accepted | rejected | superseded | done
date: YYYY-MM-DD
author: SD | CJ            # NUEVO — siempre poblado
approvers: [SD, CJ]         # NUEVO — solo en `type: decision`
owner: SD | CJ              # NUEVO — solo en `type: plan` (quién ejecuta)
tags: [...]
related: [...]
---
```

### 9.4 Code review policy — qué requiere review del otro

Para no bloquear self-merges innecesarios pero sí proteger áreas críticas:

| Área | Política |
|---|---|
| `supabase/migrations/*.sql`, `supabase/schema.sql` | **Review obligatorio del otro** — afecta DB compartida + RLS |
| `src/lib/auth*`, `src/lib/supabase.ts` | Review obligatorio — auth y session management |
| `src/lib/inventory.ts`, `src/lib/locations.ts`, `src/lib/projects.ts` | Review obligatorio — lógica de negocio core |
| `CLAUDE.md`, `FUNCTIONAL_SPEC.md`, `TECHNICAL_SPEC.md` | Review obligatorio — convenciones y specs canónicos |
| `docs/decisions/*.md` (cuando se cree) | Review obligatorio — decisiones arquitectónicas |
| `src/components/islands/*` (refactors / nuevos islands) | Review opcional — recomendado pero no bloqueante |
| Tests (`src/test/*`, `e2e/*`) | Self-merge OK si tests pasan |
| `docs/proposals/*`, `docs/plans/*` | Self-merge OK con status `draft`; `accepted` requiere co-sign |
| Bug fixes triviales (one-liners) | Self-merge OK |
| `mockups/index.html` | Self-merge OK |

**Mecanismo**: GitHub branch protection no es trivial de configurar para selección por path en plan free; por ahora la regla es **honor system** documentada en CLAUDE.md. Si en práctica se viola, evaluar GitHub CODEOWNERS.

### 9.5 Lessons / decisions — más valor con equipo

Con un solo desarrollador, capturar lecciones es nice-to-have. Con dos, es **comunicación asincrónica esencial**. Cuando SD aprende algo en una sesión que CJ no presenció (o viceversa), un `docs/lessons/YYYY-MM-DD-tema.md` corto evita que el otro tropiece con la misma piedra.

Esto **eleva la prioridad** de Fase 3 de "opcional" a "recomendada al primer hallazgo no obvio".

### 9.6 Idioma — confirmación

Por defecto el equipo opera en español (rioplatense / variantes regionales). Los docs siguen en español; commits + nombres de branch en inglés (per CLAUDE.md global de SD). **Confirmar con CJ** que está de acuerdo o si prefiere variante.

### 9.7 Items que NO cambian por equipo

Para evitar over-engineering: las siguientes piezas del plan original **siguen igual** porque la incorporación de CJ no las afecta:

- `notas-atomicas-y-mocs` — sigue diferida; volumen de docs no lo justifica todavía
- `openspec` / `regen` — sigue siendo sobreingeniería para iot-assistant
- `followups-cycle-*` files — GitHub Issues sigue siendo el tracker correcto
- Migración masiva de SPECs grandes — sigue siendo NO retrofit; solo boy scout
- Wikilinks Obsidian — siguen no aplicando; markdown estándar

### 9.8 Resumen ejecutivo de cambios por equipo

7 items nuevos en el plan, todos **bajo esfuerzo**:

1. Sección "Team" en CLAUDE.md (Fase 1)
2. Sección "Code review policy" en CLAUDE.md (Fase 1)
3. Carpetas personales con reading policy (Fase 1 política + Fase 3 creación)
4. Campo `author` en frontmatter vocabulario (Fase 2)
5. Campo `approvers` en `type: decision` (Fase 2)
6. Campo `owner` en `type: plan` (Fase 2)
7. Lessons elevado de "opcional" a "recomendado" (Fase 3-4)

Total adicional: **0 fases nuevas**, **7 items distribuidos en fases existentes**, **0 items rechazados** por incorporación de CJ.
