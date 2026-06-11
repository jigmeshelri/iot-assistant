---
type: proposal
project: iot-assistant
status: draft
date: 2026-06-11
author: SD
team: [SD, CJ]
tags: [arquitectura, cloudflare, migracion, supabase, d1, r2, workers]
related:
  - ./2026-05-09-doc-conventions-adoption.md
---

# Propuesta: Migración de Stack Arquitectónico a Cloudflare (Serverless Edge)

> Propuesta técnica para migrar la arquitectura actual basada en Astro (Vercel) + Supabase (PostgreSQL/RLS) + FastAPI (Railway) hacia un ecosistema unificado y serverless 100% hospedado en Cloudflare (Pages, Workers, D1, R2 y Workers AI).

---

## 1. Contexto y Estado Actual

Dejame verificar cómo estamos parados hoy. Según `TECHNICAL_SPEC.md` y `CLAUDE.md`, el sistema está distribuido de la siguiente forma:

- **Frontend:** Astro 6 (SSG/ISR) + React 19 Islands. Desplegado en Vercel.
- **Backend Core & Database:** Supabase Cloud (PostgreSQL 16 con Row-Level Security (RLS) + Supabase Auth + Supabase Storage). Supabase actúa como nuestro BFF y fuente de verdad de seguridad.
- **AI Microservice:** FastAPI (Python 3.12) desplegado en Railway/Fly.io. Se encarga del reconocimiento de componentes (Claude/GPT-4o), generación de código y composición de etiquetas QR dinámicas con Pillow.

### ¿Por qué evaluar Cloudflare?
El ecosistema de Cloudflare nos ofrece una infraestructura en el edge con latencia ultra baja, costos operativos casi nulos (gracias a su capa gratuita extremadamente generosa) y un modelo de desarrollo unificado (TypeScript de punta a punta, sin necesidad de mantener un contenedor de Python separado en Railway).

---

## 2. Propuesta de Arquitectura Target

La meta es consolidar todo el stack bajo el paraguas de Cloudflare, reduciendo los proveedores de infraestructura de tres (Vercel, Supabase, Railway) a uno solo.

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (PWA)                        │
│             Astro 6 (SSR) + React 19 Islands                │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS (Edge Routing)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cloudflare Pages & Workers                  │
│  • SSR & API Routes (JS/TS)                                 │
│  • Autenticación (Lucia Auth / Auth.js en Workers KV)       │
│  • QR Generation (JS Canvas / qrcode npm)                   │
│  └───────────────────────────┬──────────────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│  Cloudflare D1  │   │  Cloudflare R2  │   │   Workers AI    │
│  (SQLite Edge)  │   │  (S3 Storage)   │   │  (Modelos Llama/│
│  Datos Core     │   │  Fotos/Planos   │   │  Mistral/Vision)│
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 3. Análisis de Tradeoffs (El "Ojo Clínico" de Arquitectura)

¡Ojo! No todo es color de rosas, hermano. Cambiar de stack no es soplar y hacer botellas. Tenemos que entender las implicancias reales antes de tirar la primera línea de código:

### 3.1 La Pérdida de Supabase RLS (El Cambio Más Crítico)
- **El Modelo Actual:** Nuestra seguridad se apoya en PostgreSQL RLS. El cliente frontend consulta a la DB directamente y Postgres filtra los datos basándose en el JWT del usuario autenticado. `TECHNICAL_SPEC.md` dice: *"RLS como única fuente de verdad de autorización — ninguna capa de aplicación filtra datos por usuario"*.
- **El Modelo Cloudflare D1:** D1 está basado en SQLite. **SQLite no tiene Row-Level Security.**
- **Impacto:** Si migramos a D1, **toda la lógica de autorización debe pasar a la capa de aplicación (Astro/Workers)**. Esto incrementa la superficie de ataque para bugs de seguridad (e.g., olvidarse de filtrar por `user_id` en una query de lectura/escritura).
- **Alternativa:** Si queremos mantener RLS pero usar Cloudflare para cómputo, deberíamos usar Cloudflare Hyperdrive para conectarnos a una base de datos Postgres (Supabase o Neon) en lugar de usar D1.

### 3.2 Python (FastAPI + Pillow) vs JS en Workers
- **El Modelo Actual:** Usamos Python porque las librerías de análisis de imágenes y manipulación gráfica (Pillow) son maduras. El backend de FastAPI en Railway expone `/qr/{qr_code}` que compone un PNG combinando el QR y texto de etiqueta.
- **El Modelo Cloudflare:** Cloudflare Workers solo corre JS/TS o WASM.
- **Solución:** Debemos reescribir la generación de etiquetas usando una librería de Canvas pura en JS (como `@napi-rs/canvas` si el runtime lo soporta, o manipulando directamente streams de PNG/SVG en el Worker).

### 3.3 Base de Datos: PostgreSQL vs SQLite (D1)
- **Postgres (Supabase):** Soporta tipos complejos (JSONB indexado con GIN, arrays nativos `TEXT[]`, tipos ENUM estructurados, triggers PL/pgSQL complejos y queries jerárquicas recursivas para ubicaciones).
- **D1 (SQLite):** Soporta tipos básicos (TEXT, INTEGER, REAL, BLOB).
  - Los arrays (como `tags TEXT[]`) y JSONB deben almacenarse como strings planos y parsearse en la app.
  - Los triggers en SQLite son mucho más limitados que en Postgres.
  - La consulta jerárquica recursiva de `locations` (`parent_id`) funciona en SQLite mediante CTEs recursivas, pero con sintaxis diferente.

---

## 4. Comparativa de Servicios

| Componente | Stack Actual | Stack Propuesto (Cloudflare) | Esfuerzo de Migración | Complejidad / Riesgo |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting Frontend** | Vercel | Cloudflare Pages | Bajo (usar `@astrojs/cloudflare`) | Muy Bajo |
| **Base de Datos** | Supabase Postgres (16) | Cloudflare D1 (SQLite) | Alto (reescribir schema, triggers, consultas) | **Muy Alto** (Pérdida de RLS) |
| **Autenticación** | Supabase Auth (JWT) | Workers KV + Lucia Auth / Clerk | Medio (implementar flujos de sesión) | Medio |
| **Storage** | Supabase Storage | Cloudflare R2 | Medio (cambiar cliente Supabase por S3 SDK) | Bajo |
| **Microservicio IA** | FastAPI (Railway) | Cloudflare Workers AI / Workers API Calls | Alto (reescribir endpoints en TS, prompt adapters) | Medio (cambio de modelos) |
| **Generación QR** | Python (Pillow) | Worker (JS Canvas/SVG) | Medio (reescribir lógica de layout gráfico) | Bajo |

---

## 5. Plan de Adopción por Fases (Iterativo e Incremental)

Para no romper nada y avanzar con pie de plomo, el plan de migración se divide en 4 fases. Podés frenar al final de cualquier fase y el sistema seguirá siendo funcional.

### Fase 1: Hosting y Cómputo Edge (Astro en Cloudflare Pages)
- **Objetivo:** Migrar el frontend de Vercel a Cloudflare Pages.
- **Acciones:**
  1. Instalar `@astrojs/cloudflare` en el proyecto Astro.
  2. Configurar la renderización híbrida o SSR en `astro.config.mjs`.
  3. Configurar el pipeline en Cloudflare Pages.
- **Nota:** En esta fase, el frontend sigue conectándose a Supabase (Auth, DB, Storage) y al FastAPI de Railway. El riesgo es nulo.

### Fase 2: Desmantelamiento de FastAPI (AI & QR a Workers)
- **Objetivo:** Eliminar el microservicio de Python y la dependencia de Railway.
- **Acciones:**
  1. Crear endpoints API en Astro (`src/pages/api/ai/...`) que manejen la lógica de prompts.
  2. Migrar las llamadas de OpenAI/Anthropic a ejecutarse directamente desde el runtime de Cloudflare Workers (o usar Workers AI para modelos open-source como Llama-3 en el edge).
  3. Implementar la generación de etiquetas QR usando librerías pure-JS en un endpoint Astro API.
- **Resultado:** Apagamos Railway. Ahorramos costos y simplificamos el despliegue.

### Fase 3: Migración de Storage (Supabase Storage a R2)
- **Objetivo:** Mudar las imágenes de componentes y bitácoras a R2.
- **Acciones:**
  1. Crear un bucket en Cloudflare R2.
  2. Implementar un cliente de almacenamiento S3 compatible en `src/lib/storage.ts`.
  3. Script de migración de objetos existentes de Supabase a R2.

### Fase 4: Migración Core - Base de Datos y Auth (El paso decisivo)
- **Objetivo:** Mudar de Postgres a D1 y de Supabase Auth a Lucia/KV.
- **Acciones:**
  1. Traducir el schema de base de datos (`supabase/schema.sql`) a formato SQLite.
  2. Reescribir todas las interacciones de base de datos en `src/lib/` para usar el driver de D1 (`platform_family` binding).
  3. **Crucial:** Implementar la lógica de verificación de acceso (el reemplazo de RLS) en los métodos de acceso a datos en `src/lib/`.
  4. Migrar los usuarios de Supabase Auth a una tabla local de usuarios y configurar Lucia Auth sobre D1/KV.
  5. Script de migración de datos (Postgres dump -> SQLite insert statements).

---

## 6. Preguntas Abiertas y Decisiones Requeridas

Antes de mover un solo pelo, nos tenemos que poner de acuerdo en esto:

1. **¿Mantenemos Supabase Postgres y solo migramos el hosting/AI?**
   > [!IMPORTANT]
   > Esta es la opción más sensata si no queremos perder RLS ni reescribir toda la base de datos. Usaríamos Astro en Cloudflare Pages + Cloudflare Workers para IA, conectándonos a Supabase a través de Hyperdrive. Ahorramos dolores de cabeza de seguridad.
2. **Si vamos por D1, ¿cómo aseguramos la capa de datos sin RLS?**
   > [!WARNING]
   > Sin RLS, si un desarrollador escribe `db.select().from(locations)` sin un `.where(eq(locations.userId, currentUser.id))`, exponemos datos de otros usuarios. ¿Estamos listos para implementar tests de integración rigurosos que aseguren que no haya fugas de datos?
3. **¿Workers AI vs APIs Externas (OpenAI/Anthropic)?**
   > [!NOTE]
   > Workers AI nos permite correr modelos como `llama-3` o `mistral` gratis/barato directamente en la red de Cloudflare. Sin embargo, para reconocimiento de componentes complejos, Claude Vision suele ser superior. ¿Usamos Workers AI para tareas básicas y APIs externas para visión?

---

¿Cómo la ves, hermano? Ponete las pilas, leé bien los tradeoffs de RLS y avisame si avanzamos con esta base para armar el plan detallado. ¡Dale!
