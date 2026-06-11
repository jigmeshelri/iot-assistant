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

> [👉 Ver versión enriquecida en HTML para Humanos](./2026-06-11-architecture-migration-cloudflare.html)

## 1. Current Architecture Stack
- **Frontend:** Astro 6 (SSG/ISR) + React 19 Islands on Vercel.
- **Backend BFF & DB:** Supabase Cloud (PostgreSQL 16 with RLS + Supabase Auth + Supabase Storage).
- **AI Microservice:** FastAPI (Python 3.12) on Railway/Fly.io. Handles:
  - Component recognition (Claude/GPT-4o).
  - Code generation.
  - Dynamic QR label composition (using `qrcode` + `Pillow`).

## 2. Target Architecture Stack (All-in Cloudflare)
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

### 3.4 Cloudflare Workers AI Deep Dive
- **Frictions:**
  - **Context Window:** Native edge models (Llama 3 8B, Mistral 7B) have limited context (8k - 32k) compared to Claude 3.5 Sonnet (200k). Insufficient for complex firmware codebases or large inventory context.
  - **Vision Model Quality:** Component recognition requires high-fidelity identification of chip markings. Edge vision models (Llama-3.2-Vision) have significantly lower accuracy compared to Claude 3.5 Sonnet or GPT-4o.
  - **Cold Starts & Queueing:** Shared GPU nodes can experience latency spikes or queuing under heavy loads.
- **Costs:**
  - Billed in Cloudflare "Neurons" (10,000 free neurons daily, then ~$0.01 - $0.07 per 1M tokens depending on model size).
  - Vastly cheaper than Anthropic/OpenAI APIs, but comes with model intelligence degradation.
- **Competitors:**
  - **Groq:** Faster inference, dedicated LPU, but requires external API calls (network hop).
  - **Replicate / RunPod:** Dedicated serverless GPU containers. High customizability, but high base cost and cold start latency.
  - **Frontier APIs (Anthropic/OpenAI):** Unmatched reasoning/vision capabilities, high billing per token, network hop latency.

## 4. Hybrid Architecture Scenarios

### Scenario A: Hybrid Storage & Compute (Astro Pages + Supabase Core + R2 Storage + API AI)
- **Stack:**
  - Astro hosted on Cloudflare Pages.
  - Database, Auth, and RLS remain in Supabase Cloud.
  - Media & Files moved to Cloudflare R2.
  - AI runs via direct API calls to Anthropic/OpenAI from Pages/Workers (FastAPI removed).
- **KPI Impact:**
  - *Access Speed:* High. Frontend rendering on edge; DB queries have ~20ms hop to Supabase.
  - *Admin Simplicity:* High. Preserves Postgres, RLS, and Supabase UI.
  - *Costs:* Lower egress costs (R2 has $0 egress fees vs Supabase Storage egress).
- **Complexity / Difficulty:** Low. No database schema or auth system migration needed.

### Scenario B: Edge-Optimized Hybrid (Astro Pages + Cloudflare Hyperdrive + Supabase Postgres/Auth + R2 + API AI)
- **Stack:**
  - Same as Scenario A, but adds Cloudflare Hyperdrive to pool and cache Postgres connections to Supabase.
- **KPI Impact:**
  - *Access Speed:* Very High. Hyperdrive reduces connection handshake latency to < 5ms. Caches frequent queries at the edge.
  - *Admin Simplicity:* High. Keeps Supabase Postgres, RLS, and Auth.
  - *Costs:* Low-Medium (Supabase database compute + R2 + Hyperdrive free tier).
- **Complexity / Difficulty:** Medium. Requires configuring Hyperdrive tunnel and database connection pooling.

### Scenario C: All-In Cloudflare (Pages + D1 + R2 + Workers AI)
- **Stack:**
  - All resources hosted natively in Cloudflare.
- **KPI Impact:**
  - *Access Speed:* Maximum. Zero network hops; DB and compute are co-located in the same edge data center.
  - *Admin Simplicity:* Medium. Unified Cloudflare dashboard, but no built-in database GUI like Supabase Studio.
  - *Costs:* Lowest. Extremely cheap serverless billing.
- **Complexity / Difficulty:** Very High. Full schema translation, database triggers rewrite, auth rewrite (KV/D1 + Lucia), and application-layer RLS replication.

---

## 5. Service Matrix
| Layer | Current Service | Scenario A (Hybrid) | Scenario B (Edge Hybrid) | Scenario C (All-In CF) |
| :--- | :--- | :--- | :--- | :--- |
| **Hosting** | Vercel | Cloudflare Pages | Cloudflare Pages | Cloudflare Pages |
| **Database** | Supabase Postgres | Supabase Postgres | Supabase Postgres (via Hyperdrive) | Cloudflare D1 (SQLite) |
| **Auth** | Supabase Auth | Supabase Auth | Supabase Auth | Lucia Auth + KV/D1 |
| **Storage** | Supabase Storage | Cloudflare R2 | Cloudflare R2 | Cloudflare R2 |
| **AI Engine** | FastAPI (Railway) | Anthropic API (via Worker) | Anthropic API (via Worker) | Workers AI / External API |
| **Risk / Complexity**| None | **Low** | **Medium** | **Very High** (RLS Loss) |

---

## 6. Implementation Phases (Scenario B Recommended Path)
### Phase 1: Edge Hosting & Storage
- **Goal:** Migrate frontend to Pages and media to R2.
- **Action:** Install `@astrojs/cloudflare` adapter. Setup R2 bucket. Adapt `src/lib/storage.ts` to S3 API.
- **Dependency:** None.

### Phase 2: connection Optimization (Hyperdrive)
- **Goal:** Optimize database query latency from the edge.
- **Action:** Configure Cloudflare Hyperdrive to connect to Supabase Postgres. Update database connection string in Astro config.
- **Dependency:** Phase 1.

### Phase 3: FastAPI Removal & API Integration
- **Goal:** Remove Python FastAPI dependency.
- **Action:** Create Astro API endpoints. Port AI logic to JS/TS calling Anthropic/OpenAI APIs directly. Port QR generation code to JS canvas.
- **Dependency:** Phase 1-2.

---

## 7. Open Decisions
1. **Scenario Selection:** Do we proceed with Scenario B (Hyperdrive + Supabase Postgres/Auth + R2) to preserve security RLS while gaining edge performance, or Scenario C (All-In) to eliminate Supabase entirely?
2. **AI Engine Choice:** Do we use Workers AI for basic text tasks (cheap/fast) and keep Anthropic/OpenAI for vision/code tasks, or run 100% on external API calls?
