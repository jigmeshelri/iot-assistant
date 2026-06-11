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

# SDD Proposal: Cloudflare Migration (Serverless Edge)

## 1. Current Architecture Stack
- **Frontend:** Astro 6 (SSG/ISR) + React 19 Islands on Vercel.
- **Backend BFF & DB:** Supabase Cloud (PostgreSQL 16 with RLS + Supabase Auth + Supabase Storage).
- **AI Microservice:** FastAPI (Python 3.12) on Railway/Fly.io. Handles:
  - Component recognition (Claude/GPT-4o).
  - Code generation.
  - Dynamic QR label composition (using `qrcode` + `Pillow`).

## 2. Target Architecture Stack
- **Unified Provider:** Cloudflare Platform.
- **Frontend/BFF:** Astro 6 (SSR) on Cloudflare Pages.
- **Database:** Cloudflare D1 (SQLite) or Hyperdrive tunnel to PostgreSQL.
- **Auth:** Lucia Auth / Auth.js (using Workers KV).
- **Storage:** Cloudflare R2 (S3-compatible).
- **AI Engine:** Cloudflare Workers AI (Llama/Mistral/Vision) or Workers proxy to OpenAI/Anthropic APIs.
- **QR Generation:** Cloudflare Worker (pure JS Canvas/SVG or `qrcode` npm package).

## 3. Critical Tradeoffs & Risks
### 3.1 Loss of Supabase RLS (High Severity)
- **Current:** DB-level authorization via PostgreSQL RLS.
- **Proposed (D1):** SQLite does not support RLS.
- **Mitigation:** Access control must be handled in application layer (`src/lib/*`). High risk of data leak due to developer query mistakes.
- **Alternative:** Hyperdrive to PostgreSQL (Supabase/Neon) preserves RLS.

### 3.2 Database Engine Shift (Medium Severity)
- **Current:** PostgreSQL features (JSONB GIN indexes, `TEXT[]` arrays, DB triggers, recursive CTEs).
- **Proposed:** D1 SQLite.
- **Mitigation:** Serialize arrays/JSON to strings, rewrite queries, limit triggers, rewrite recursive location tree queries.

### 3.3 Microservice Shift: Python to JS/TS (Low Severity)
- **Current:** FastAPI + Pillow.
- **Proposed:** Cloudflare Workers.
- **Mitigation:** Rewrite dynamic PNG label layout generation in pure JS/TS (e.g. svg template or JS canvas library).

## 4. Service Matrix
| Layer | Current Service | Target Service | Migration Effort | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting** | Vercel | Cloudflare Pages | Low | Low |
| **Database** | Supabase Postgres | Cloudflare D1 | High | **Very High** (RLS Loss) |
| **Auth** | Supabase Auth | Lucia/KV | Medium | Medium |
| **Storage** | Supabase Storage | Cloudflare R2 | Medium | Low |
| **AI** | FastAPI (Railway) | Workers AI / Workers API | High | Medium |
| **QR Gen** | Python (Pillow) | Worker (JS/Canvas) | Medium | Low |

## 5. Implementation Phases
### Phase 1: Edge Hosting (Cloudflare Pages)
- **Goal:** Migrate frontend compilation/hosting to Pages.
- **Action:** Install `@astrojs/cloudflare` adapter. Configure hybrid/SSR. Run deployment pipeline.
- **Dependency:** None. Backend/Auth/FastAPI remain unchanged.

### Phase 2: FastAPI Removal (Workers AI & QR)
- **Goal:** Turn off Railway/Python.
- **Action:** Create Astro API endpoints under `src/pages/api/ai/*`. Move Claude API calls to TS. Implement pure JS QR generator.
- **Dependency:** Phase 1.

### Phase 3: Storage Migration (R2)
- **Goal:** Move assets to R2.
- **Action:** Provision R2 bucket. Implement S3 client in `src/lib/storage.ts`. Run assets migration script.
- **Dependency:** Phase 1.

### Phase 4: Core DB & Auth Migration
- **Goal:** Migrate Auth/Database to Cloudflare native.
- **Action:** Convert SQL schema to SQLite format. Rewrite `src/lib/*` database drivers for D1. Implement application-level tenant isolation (RLS replacement). Migrate users to Lucia Auth on KV/D1. Run data migration script.
- **Dependency:** Phase 1-3.

## 6. Open Decisions
1. **D1 Migration vs Hyperdrive Postgres:** Do we proceed with D1 (losing RLS) or hyperdrive-tunnel to a Postgres instance to preserve RLS?
2. **Security Verification without RLS:** If using D1, how do we enforce integration tests to guarantee tenant isolation at app layer?
3. **Workers AI vs Third-Party Vision APIs:** Do we use local open-source models on Workers AI or external Claude Vision API for component analysis?
