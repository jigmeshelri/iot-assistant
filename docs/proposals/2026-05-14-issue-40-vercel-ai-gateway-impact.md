# Análisis de impacto — Issue #40: Vercel AI Gateway + BYOK + Deepseek

**Fecha**: 2026-05-14
**Autor**: análisis técnico inicial (Claudio)
**Estado**: propuesta — pendiente decisión SD
**Issue**: [#40 — Explorar el uso de IA Gateway de vercel](https://github.com/jigmeshelri/iot-assistant/issues/40)
**Branch base**: `sergio/docs/functional-spec-v0.5-cross-device` (PR #39)

---

## 0. TL;DR

El issue #40 propone reemplazar **Railway + FastAPI + Anthropic SDK** por **Vercel AI Gateway + BYOK + Deepseek**. El cambio toca cuatro dimensiones:

1. **Infra**: elimina un deployable (Railway) y un servicio (Python).
2. **Lenguaje**: el `api/` Python se reemplaza o se reduce a un cliente delgado. Si se migra a Astro endpoints / Vercel Functions, el stack queda en **TypeScript end-to-end**.
3. **Modelo**: pasa de **Claude (Anthropic)** a **Deepseek** como provider primario; el Gateway permite multi-provider con la misma interfaz.
4. **Costos**: Deepseek es **~1 a 2 órdenes de magnitud más barato** que Claude Opus/Sonnet por token. Pero **Scan IA (§4.6) depende de un modelo de visión** — y la disponibilidad de Deepseek-VL via Gateway es el **bloqueador real** del switch completo.

**Recomendación corta**: aplicar #40 **parcialmente** — mover los endpoints de texto (`/ai/projects/*`, `/ai/code/*`) a Deepseek via Gateway, **mantener Claude Vision para `/ai/recognize`** hasta que Deepseek-VL esté disponible y validado contra AC-4.6.1/§1.5. El Gateway de Vercel habilita esa convivencia con una sola integración.

---

## 1. Estado actual (en la branch del PR #39)

### 1.1 Arquitectura

```
Astro (Vercel)  ─HTTP─►  FastAPI (Railway)  ─SDK─►  Anthropic API
                              │
                              └─JWT verify─►  Supabase /auth/v1/user
```

### 1.2 Detalle del servicio Python

`api/main.py` (~500 LOC) expone 5 endpoints de IA y 1 de QR:

| Endpoint | Usado por (UI) | Modelo | Modalidad |
|---|---|---|---|
| `POST /ai/recognize` | Scan IA (§4.6) | `claude-opus-4-6` | **Vision** (imagen + texto) |
| `POST /ai/projects/discover` | Inteligencia §4.9.1 | Claude (text) | Texto |
| `POST /ai/projects/plan` | Inteligencia §4.9.2 | Claude (text) | Texto |
| `POST /ai/code/generate` | Code gen §4.10.2 | Claude (text) | Texto |
| `POST /ai/code/analyze` | (Won't Have v1 §8) | Claude (text) | Texto |
| `GET  /qr/{qr_code}` | QR de ubicaciones | — | (No IA) |

Dependencias relevantes: `fastapi`, `anthropic>=0.34.0`, `httpx`, `qrcode[pil]`, `pydantic`.

Settings expuestos: `AI_PROVIDER=anthropic|openai`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`.

### 1.3 Despliegue

- **Railway**: servicio FastAPI + Dockerfile. Costo estimado **USD 5–20/mes** (depende de plan y uptime).
- **Vercel**: frontend Astro estático/SSR.

### 1.4 Decisiones del v0.5 que se cruzan

- **D6** (§0.1): *"El chat genérico actual (`api/` Railway) se refactorea. El agente pasa a ser invocable desde cada vista con contexto rico pre-cargado."* — abre la puerta al cambio pero NO define la infra de reemplazo.
- **§4.6 línea 523**: *"modelo de visión (ej. Claude Vision / GPT-4o)"* — provider-specific en la redacción.
- **§4.10**: sección "Por escribir" → es el lugar natural para documentar la decisión de infra.
- **§8**: deferred QR a v2 → el endpoint `/qr/*` desaparece en algún momento → si se mata Railway, no hay nada que migrar de ese endpoint.

---

## 2. Qué propone Issue #40

Reemplazar la API Python deployada en Railway por:

- **Vercel AI Gateway**: capa de routing/observability **OpenAI-compatible** que normaliza la interfaz contra múltiples providers (Anthropic, OpenAI, Deepseek, Groq, etc.). Permite cambiar provider sin tocar código de cliente.
- **BYOK** (*Bring Your Own Key*): cada llamada usa una API key del provider final. La key puede ser:
  - **Por producto**: una sola key (la de SD/CJ) que cubre a todos los usuarios. Operacionalmente más simple para MVP, pero los costos los paga el producto.
  - **Por usuario**: cada user trae su key de Deepseek. Mayor complejidad (UI de onboarding, storage seguro, validación) pero costos se delegan al usuario.
- **Deepseek** como provider primario.

---

## 3. Cambio de lenguaje y arquitectura

Tres caminos concretos, de menor a mayor disruption.

### Camino A — Mínimo: swap del cliente en Python

Se mantiene FastAPI en Railway. Solo cambia el SDK:

```python
# antes
client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

# después
client = openai.OpenAI(
    base_url="https://ai-gateway.vercel.sh/v1/...",
    api_key=user_key_or_product_key,
)
```

- **Cambio en código**: ~30–50 LOC en `api/main.py`, swap de `anthropic` por `openai` en `requirements.txt`.
- **Infra**: Railway sigue.
- **No cumple el objetivo de #40** ("reemplazar Railway") — solo cambia el provider.
- **Lenguaje**: Python sigue.

### Camino B — Astro endpoints (TypeScript, dentro del mismo deployable)

Los 5 endpoints `/ai/*` se reescriben como **Astro server endpoints** en `src/pages/api/ai/*.ts`. La app entera se despliega en Vercel.

- **Cambio en código**: ~500 LOC Python → ~400 LOC TypeScript. Cero red entre frontend y API (mismo deployable).
- **Infra**: Railway **se elimina**. Solo queda Vercel.
- **Lenguaje**: el repo queda **TS end-to-end** — alineado con el resto del stack (Astro 6 + React 19).
- **JWT**: Astro endpoints validan via `@supabase/supabase-js` directo, sin segunda llamada HTTP a Supabase Auth.
- **Pérdida**: el `Dockerfile` y `docker-compose.yaml` (donde el `api` corre local) se reducen. Tests E2E mockean HTTP igual.
- **Esfuerzo**: medio sprint (5 endpoints + tests + migración de fixtures).

### Camino C — Vercel Functions standalone

Los endpoints viven en `/api/*` de Vercel (no Astro). Útil si se quiere desacoplar la IA del frontend o si Astro SSR no soporta streaming bien para algún caso. **No tiene ventaja clara** sobre el camino B en este repo, dado que el frontend ya está en Vercel y los endpoints son llamados desde el cliente Astro.

### Comparativa rápida

| Dim | A (Python+swap) | B (Astro endpoints TS) | C (Vercel Functions TS) |
|---|---|---|---|
| Cumple #40 ("reemplaza Railway") | ❌ | ✅ | ✅ |
| Lenguaje unificado | ❌ | ✅ | ✅ |
| Esfuerzo | XS | M | M |
| Deployables | 2 (Vercel + Railway) | 1 (Vercel) | 1 (Vercel) |
| Streaming UI (SSE) | requiere ajuste CORS | nativo | nativo |
| Riesgo de regresión Scan IA | Bajo | Medio (reescritura) | Medio |

**Camino recomendado: B** — alinea con el objetivo de #40 y con el stack del resto del repo.

---

## 4. Alternativas de modelo: Anthropic vs Deepseek (y multi-provider)

### 4.1 Capacidades por modalidad

| Modalidad | Anthropic | Deepseek | Notas |
|---|---|---|---|
| **Texto general** (chat, JSON estructurado) | Claude Opus / Sonnet / Haiku 4.x | Deepseek-V3 / Deepseek-Chat | Ambos soportan tool use y JSON mode |
| **Reasoning denso** (planificación de BOM §4.9.2) | Sonnet 4.x con extended thinking | Deepseek-R1 (reasoning) | Deepseek-R1 es competitivo en benchmarks de razonamiento |
| **Vision** (Scan IA §4.6) | Opus/Sonnet/Haiku 4.x — first-class | Deepseek-VL2 | **Crítico**: Deepseek-VL2 vía Vercel Gateway puede no estar disponible — **verificar antes de comprometer §4.6 a Deepseek** |
| **Latencia** | Haiku 4.x es rápido; Sonnet medio | Deepseek-V3 medio-rápido | Para AC-4.6.1 (latencia scan p95 < 10s) la red al provider importa más que el modelo |
| **JSON structured output** | Robusto (tool use estable) | Funciona pero más frágil — los tests E2E (`ai-mock.ts`) usan `json-repair` ya | El parser `_parse_ai_json` en `api/main.py` ya tolera respuestas imperfectas |

### 4.2 Implicancias para los endpoints actuales

| Endpoint | Modelo mínimo viable | Riesgo de migrar a Deepseek |
|---|---|---|
| `/ai/recognize` (Scan IA) | Vision + reconocimiento de componentes electrónicos pequeños | **Alto** — Deepseek-VL no está probado para componentes electrónicos en este dominio. AC-4.6.1 (precisión > 70%) es la métrica de §1.5 que valida la feature |
| `/ai/projects/discover` | Texto, JSON estructurado | Bajo — Deepseek-V3 cubre bien |
| `/ai/projects/plan` | Texto + reasoning | Bajo–medio — Deepseek-R1 es buen fit |
| `/ai/code/generate` | Code generation | Bajo — Deepseek-Coder es competitivo con Claude para código Arduino/ESP-IDF |
| `/ai/code/analyze` | Diferida (§8) | N/A |

### 4.3 Lo que habilita el Gateway

El valor real de Vercel AI Gateway no es "elegir Deepseek" — es **mantener varios providers detrás de una interfaz única** con observabilidad, rate limiting y BYOK por provider. Eso permite:

- **Estrategia híbrida**: vision a Claude (Scan IA), texto a Deepseek (todo lo demás).
- **A/B testing** de modelos por endpoint sin tocar código de aplicación.
- **Fallback**: si Deepseek tira 5xx, ruteo automático a otro provider.

Esto es la respuesta correcta a la pregunta "¿Anthropic o Deepseek?": **ninguno excluyente** — el Gateway permite ambos.

---

## 5. Análisis de costos

> Los precios listados son **referenciales** (orden de magnitud) — verificar contra páginas oficiales antes de tomar decisión final. Las cifras se mueven trimestralmente.

### 5.1 Costo por token (USD por millón de tokens)

| Modelo | Input | Output | Multimodal |
|---|---:|---:|---|
| Claude Opus 4.x | ~15 | ~75 | sí |
| Claude Sonnet 4.x | ~3 | ~15 | sí |
| Claude Haiku 4.x | ~1 | ~5 | sí |
| Deepseek-V3 (chat) | ~0.27 | ~1.10 | no (texto) |
| Deepseek-R1 (reasoning) | ~0.55 | ~2.20 | no (texto) |
| Deepseek-VL2 | (verificar) | (verificar) | sí |

**Lectura**: Deepseek-V3 es **~10–50× más barato** que Claude por token. En workloads de texto puro (planificación, code gen), el ahorro es sustancial. En vision la comparación es menos clara porque la disponibilidad de Deepseek-VL es la incógnita.

### 5.2 Estimación de costo por operación

Asumiendo (estimaciones de gruesa, basadas en el código actual de `api/main.py`):

| Operación | Input ~tokens | Output ~tokens | Costo Claude Sonnet | Costo Deepseek-V3 |
|---|---:|---:|---:|---:|
| Scan IA (imagen + prompt) | 1500 (vision) | 400 | ~USD 0.011 | (Deepseek-VL pendiente) |
| Discover projects | 800 | 1200 | ~USD 0.020 | ~USD 0.0015 |
| Plan project | 1200 | 1800 | ~USD 0.031 | ~USD 0.0023 |
| Code generate | 600 | 2000 | ~USD 0.032 | ~USD 0.0024 |

A **100 operaciones/día/usuario** (escenario MVP con SD + CJ + 5 early adopters de §7.1 v0.6):
- 100 op × 7 users × 30 días = 21.000 op/mes
- Si mix es 30% scan, 30% discover, 20% plan, 20% code:
  - **Claude Sonnet**: ~21.000 × USD 0.022 promedio = **~USD 460/mes**
  - **Deepseek (sin vision)**: ~21.000 × USD 0.002 promedio = **~USD 42/mes**
  - **Híbrido (vision en Claude, resto en Deepseek)**: ~USD 70/mes

**Diferencia: ~6–10× ahorro con híbrido, ~10× con Deepseek puro** (si vision resuelve).

### 5.3 Costo de infraestructura

| Concepto | Hoy | Camino B (issue #40 aplicado) | Δ |
|---|---:|---:|---:|
| Railway (FastAPI) | ~USD 10/mes | USD 0 | **−USD 10/mes** |
| Vercel (Astro) | actual | actual + endpoints | sin cambio en plan Hobby; en Pro depende de invocaciones |
| Vercel AI Gateway | — | pass-through (no markup según docs públicas) o markup pequeño | **verificar** |
| **Total infra** | ~USD 10/mes | ~USD 0–5/mes | **−USD 5–10/mes** |

### 5.4 BYOK — ¿quién paga?

| Modelo BYOK | Pro | Contra | Fit para MVP v0.5 |
|---|---|---|---|
| **Key del producto** (compartida) | Onboarding cero. Centraliza control y rate limits. | El producto paga todos los tokens. Riesgo de abuso. | ✅ MVP — SD/CJ son los validadores, 2 usuarios pagados es bajo costo |
| **Key por usuario** | Costos se delegan. Privacidad (cada user usa su provider). | Onboarding adicional. Storage seguro requerido. Validación de key activa. | ❌ MVP — fricción innecesaria con 2 usuarios |
| **Híbrido** (producto da default, user puede traer key) | Mejor de ambos | Más complejidad | Considerar para v0.6 con tracción |

**Recomendación**: **key del producto en v0.5**; abrir Q en §0.2 para revisar en v0.6.

### 5.5 Costo de migración (one-time)

| Item | Esfuerzo |
|---|---|
| Reescribir 4 endpoints de Python a Astro/TS (camino B) | ~1.5–2 días |
| Migrar JWT verify a `@supabase/supabase-js` | ~2 horas |
| Actualizar `e2e/fixtures/ai-mock.ts` si la interfaz HTTP cambia | ~2 horas (si la mantenemos idéntica: 0) |
| Spike de Deepseek-VL para Scan IA (validar AC-4.6.1) | ~1 día |
| Actualizar `TECHNICAL_SPEC.md` | ~2 horas |
| Actualizar `FUNCTIONAL_SPEC.md` §4.6, §4.10, §5.5, §5.6 | ~3 horas |
| **Total** | **~3–4 días-persona** |

---

## 6. Impacto sobre `FUNCTIONAL_SPEC.md` v0.5

| Sección | Tipo de cambio | Detalle |
|---|---|---|
| **§0.1 D6** | Refinar | Agregar referencia a la infra concreta — o crear **D19 nuevo** (recomendado para no sobrecargar D6) |
| **§0.1 D19 (nuevo)** | Agregar | *"Infraestructura de IA: Vercel AI Gateway + BYOK (key del producto en v0.5). Provider primario Deepseek para texto; Claude para vision (Scan IA) hasta validar Deepseek-VL"* |
| **§0.2** | Agregar Q | **Q14** (o siguiente disponible): ¿BYOK por usuario en v0.6? **Q15**: ¿Deepseek-VL llega a AC-4.6.1 o Scan IA queda en Claude? |
| **§4.6 línea 523** | Editar | *"modelo de visión (ej. Claude Vision / GPT-4o)"* → *"modelo de visión via AI Gateway — provider seleccionable (Claude Vision por defecto, Deepseek-VL en evaluación)"* |
| **§4.10** | Llenar (estaba "por escribir") | Sección entera se beneficia: define cómo el agente accede al Gateway, qué contexto se serializa, manejo de errores de provider, observabilidad |
| **§5.5 Seguridad** | Llenar | Storage de la key del producto (env var en Vercel), rotación, audit de invocaciones via Gateway |
| **§5.6 Privacidad** | Llenar | Datos del usuario pasan por Vercel + Deepseek/Anthropic. Política de retención. Si BYOK por user en v0.6, RLS sobre tabla de credenciales |
| **§6 Modelo de Datos** | Sin cambio en v0.5 | Si BYOK por user llega a v0.6: agregar `user_ai_credentials` |

## 7. Impacto sobre `TECHNICAL_SPEC.md` (fuera del PR #39 — coordinar)

| Línea | Cambio |
|---|---|
| L59 (`API IA: FastAPI 0.115.x`) | Eliminar o reemplazar por `API IA: Astro endpoints (TS)` |
| L61 (`Modelo de visión: Claude Vision (claude-opus-4-6)`) | Generalizar: `Modelo de visión: via AI Gateway (Claude Vision default, evaluando Deepseek-VL)` |
| L64 (`Despliegue API: Railway / Fly.io`) | Eliminar |
| L1040–1043 (envs `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) | Reemplazar por `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY` (la key del producto contra el Gateway) |

## 8. Impacto sobre el código

| Área | Acción |
|---|---|
| `api/main.py` (~500 LOC) | Reescribir en TS bajo `src/pages/api/ai/*.ts` (camino B) o swap del cliente (camino A) |
| `api/requirements.txt`, `api/Dockerfile` | Eliminar (camino B) |
| `docker-compose.yaml` | Quitar servicio `api` (camino B) |
| `e2e/fixtures/ai-mock.ts` | Sin cambio si se mantienen los mismos path HTTP (`POST /ai/recognize`, etc.) |
| 4 specs E2E (`ai-*.spec.ts`) | Sin cambio si la API HTTP mantiene shape de request/response |
| `.env.example` | Reemplazar `ANTHROPIC_API_KEY` por `AI_GATEWAY_API_KEY` |

---

## 9. Riesgos

1. **Deepseek-VL para Scan IA** — Si no está disponible via Vercel Gateway o no alcanza AC-4.6.1, el camino completo (todo a Deepseek) no es viable. **Mitigación**: estrategia híbrida (vision a Claude).
2. **Variabilidad de calidad entre providers** — Deepseek puede tener output JSON menos consistente que Claude para `/ai/projects/plan` (estructura compleja). **Mitigación**: `_parse_ai_json` ya tolera respuestas imperfectas; correr tests E2E (`ai-plan.spec.ts`, `ai-discover.spec.ts`) contra Deepseek antes de migrar prod.
3. **Lock-in de Gateway** — atarse a Vercel para routing de IA agrega dependencia. **Mitigación**: el Gateway es OpenAI-compatible → en peor caso, swap por OpenRouter u otro Gateway compatible sin reescribir código de aplicación.
4. **Latencia adicional del Gateway** — un hop extra. **Mitigación**: Vercel mide ~50–150ms de overhead; despreciable contra el TTFT del modelo (~2–5s).
5. **Privacidad** — datos de inventario del usuario pasan por Vercel + Deepseek. **Mitigación**: documentar en §5.6; evaluar si los datos son sensibles (probablemente no, pero merece llamada explícita).

## 10. Open Questions que deja abiertas

- **OQ-1**: ¿BYOK por usuario en v0.6 o se mantiene key del producto indefinidamente? → trackear como Q14 en §0.2.
- **OQ-2**: ¿Deepseek-VL es viable para Scan IA? → spike requerido, trackear como Q15.
- **OQ-3**: ¿Astro endpoints (camino B) o Vercel Functions standalone (camino C)? → decisión técnica de SD; preferencia: B.
- **OQ-4**: ¿Streaming (SSE) para el agente IA contextual (§4.10) o request/response síncrono en v0.5? → afecta diseño de endpoints.

## 11. Recomendación

1. **Aprobar** la dirección general de #40 — el ahorro de costos es sustancial y el Gateway desbloquea estrategia multi-provider sin lock-in.
2. **Aplicar parcial en v0.5**:
   - Migrar `/ai/projects/*` y `/ai/code/*` a **Deepseek via Gateway** (texto/reasoning/code).
   - Mantener `/ai/recognize` en **Claude Vision via Gateway** hasta validar Deepseek-VL.
3. **Adoptar camino B** (Astro endpoints en TS) — elimina Railway y unifica el stack en TypeScript.
4. **Spike previo** (1 día): probar Deepseek-VL contra 20 imágenes representativas de componentes IoT (ESP32, módulos LoRa, sensores) y medir precisión/latencia contra AC-4.6.1.
5. **Actualizar el spec v0.5** dentro del PR #39 con D19 + Q14/Q15 + edits puntuales en §4.6, §4.10, §5.5, §5.6. Eso cierra la decisión a nivel doc.
6. **PRs separados** para el código: el PR #39 es `docs(spec)` — la migración del `api/` va en uno o más PRs siguientes con scope `refactor` / `feat`.

---

## Apéndice — Datos sin verificar

Lo siguiente requiere confirmación antes de comprometerse:

- [ ] Precios exactos de Anthropic y Deepseek vigentes a 2026-05.
- [ ] Disponibilidad de Deepseek-VL2 (o equivalente vision) detrás del Vercel AI Gateway.
- [ ] Markup del Vercel AI Gateway (pass-through real vs fee oculto).
- [ ] Límites de rate / quotas del Gateway con key del producto compartida (¿escalan con tracción de v0.6?).
- [ ] Compatibilidad de Deepseek con tool use / structured output al nivel que requieren los endpoints actuales (`_parse_ai_json` y formato de `BOMItem`, `ProjectSuggestion`, etc.).
