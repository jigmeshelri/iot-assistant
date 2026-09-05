import { createAnthropic } from '@ai-sdk/anthropic'
import { createClient, type User } from '@supabase/supabase-js'
import type { BOMItem, CodeAnalyzeResponse, CodeResource, RecognizeResponse } from '../api'
import { parseBOMItems } from './aiProjects'

// Server-only helpers for the Kimi-backed AI endpoints (spike: issue #40).
// Secrets come from import.meta.env (Astro loads .env there; process.env does
// NOT include .env vars in dev), with process.env as fallback for runtimes
// that inject env directly (e.g. Vercel).

// `sk-kimi-` keys (platform.kimi.ai) are rejected by api.moonshot.ai/v1 with
// 401; they only work on the Kimi Coding endpoint, which speaks the Anthropic
// Messages protocol.
const KIMI_BASE_URL = 'https://api.kimi.com/coding/v1'
// kimi-k2.5: Moonshot's native multimodal model (text + vision, 256k context).
const DEFAULT_KIMI_MODEL = 'kimi-k2.5'

/** Returns the Kimi chat model, or null if the provider is not configured. */
export function getMoonshotModel(
  // Injectable for testing: under Vitest, import.meta.env in source modules is
  // backed by process.env, so the two resolution paths can only be exercised
  // distinctly by passing the env objects explicitly.
  metaEnv: Record<string, string | undefined> = import.meta.env,
  procEnv: Record<string, string | undefined> = process.env,
) {
  const apiKey = metaEnv.MOONSHOT_API_KEY ?? procEnv.MOONSHOT_API_KEY
  if (!apiKey) return null
  const kimi = createAnthropic({
    baseURL: KIMI_BASE_URL,
    apiKey,
  })
  return kimi(metaEnv.MOONSHOT_MODEL ?? procEnv.MOONSHOT_MODEL ?? DEFAULT_KIMI_MODEL)
}

/**
 * Verifies a `Authorization: Bearer <supabase-jwt>` header against Supabase Auth.
 * Returns the authenticated user, or a Response to send back (401/503).
 */
export async function verifyBearerToken(
  request: Request,
): Promise<{ user: User } | { error: Response }> {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    return { error: jsonError(401, 'Not authenticated') }
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined
  const supabaseKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined
  if (!supabaseUrl || !supabaseKey) {
    return { error: jsonError(503, 'Supabase not configured') }
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { error: jsonError(401, 'Invalid token') }
  }
  return { user: data.user }
}

/** Builds a JSON error response with the FastAPI-style `{ detail }` shape. */
export function jsonError(status: number, detail: string): Response {
  return new Response(JSON.stringify({ detail }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** Serializes a successful JSON payload. */
export function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Parses an AI text response as JSON, stripping markdown code fences first
 * (port of `_extract_json` + `json.loads` from api/main.py).
 * Throws unless the result is a plain object — callers translate that to a 422.
 */
export function parseAiJson(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const match = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(trimmed)
  const cleaned = (match ? match[1] : trimmed).trim()
  const parsed: unknown = JSON.parse(cleaned)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI response is not a JSON object')
  }
  return parsed as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// /api/ai/code/analyze — ported 1:1 from api/main.py
// ---------------------------------------------------------------------------

// System instructions ported 1:1 from _ANALYZE_PROMPTS in api/main.py.
export const ANALYZE_PROMPTS: Record<string, Record<string, string>> = {
  review: {
    diy: 'Review this code for obvious bugs and incorrect API usage. Keep feedback simple.',
    prototype: 'Review for bugs, race conditions, and memory leaks. Be thorough.',
    professional:
      'Perform a rigorous review: const correctness, robust error handling, thread safety, and RTOS considerations.',
  },
  optimize: {
    diy: 'Suggest simple code simplifications that improve readability.',
    prototype: 'Optimize memory and CPU usage. Reduce binary size where possible.',
    professional:
      'Optimize aggressively: analyze stack depth, heap fragmentation, energy consumption in sleep modes.',
  },
  refactor: {
    diy: 'Improve readability and variable naming. Keep it simple.',
    prototype: 'Separate configuration from logic. Keep functions short and focused.',
    professional:
      'Apply environment patterns (ESP-IDF components, Zephyr modules). Enforce single-responsibility.',
  },
}

export type AnalyzeMode = 'review' | 'optimize' | 'refactor'

export interface CodeAnalyzeRequest {
  code: string
  language: string
  environment?: string
  mode: AnalyzeMode
  project_type: string
}

/** Narrows an untyped JSON body to CodeAnalyzeRequest, or returns null. */
export function parseAnalyzeBody(body: unknown): CodeAnalyzeRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b['code'] !== 'string' || typeof b['language'] !== 'string') return null
  if (typeof b['mode'] !== 'string' || !ANALYZE_PROMPTS[b['mode']]) return null
  if (typeof b['project_type'] !== 'string') return null
  if (b['environment'] !== undefined && typeof b['environment'] !== 'string') return null
  return body as CodeAnalyzeRequest
}

/** Builds the analyze prompt (port of analyze_code in api/main.py). */
export function buildAnalyzePrompt(req: CodeAnalyzeRequest): string {
  const projectType = ['diy', 'prototype', 'professional'].includes(req.project_type)
    ? req.project_type
    : 'prototype'
  const systemInstruction = ANALYZE_PROMPTS[req.mode][projectType]
  const envHint = req.environment ? ` Target environment: ${req.environment}.` : ''

  return (
    `${systemInstruction}${envHint}\n\n` +
    `Language: ${req.language}\n\n` +
    `Code to analyze:\n\`\`\`\n${req.code}\n\`\`\`\n\n` +
    'Respond ONLY with valid JSON (no markdown fences):\n' +
    '{"explanation":"...markdown with numbered improvements...","improved_code":"...full improved code..."}'
  )
}

/**
 * Maps the parsed AI payload to the CodeAnalyzeResponse contract.
 * Throws if required fields are missing or mistyped, mirroring the Pydantic 422 behavior.
 */
export function toAnalyzeResponse(data: Record<string, unknown>): CodeAnalyzeResponse {
  if (typeof data['explanation'] !== 'string' || typeof data['improved_code'] !== 'string') {
    throw new Error('Missing required fields: explanation, improved_code')
  }
  return { explanation: data['explanation'], improved_code: data['improved_code'] }
}

// ---------------------------------------------------------------------------
// /api/ai/recognize — ported 1:1 from api/main.py
// ---------------------------------------------------------------------------

/** Prompt ported 1:1 from recognize_component in api/main.py. */
export const RECOGNIZE_PROMPT =
  'You are an expert electronics engineer. Analyze this image of an electronic component.\n' +
  'Respond ONLY with a valid JSON object (no markdown) with these fields:\n' +
  '{\n' +
  '  "name": "exact component name or model",\n' +
  '  "category": one of ["Microcontrolador","Sensor","Alimentación","Actuador","Módulo","Pasivo"],\n' +
  '  "confidence": float 0-1,\n' +
  '  "platform_family": one of ["ESP32","ESP8266","RP2040","STM32","AVR","nRF52","SAMD","Other"] or null,\n' +
  '  "connectivity_caps": {"wifi":bool,"bluetooth":bool,"ble":bool,"lora":bool,"zigbee":bool,"thread":bool,"ethernet":bool},\n' +
  '  "technical_specs": {key:value pairs of relevant specs},\n' +
  '  "datasheet_url": "url or null",\n' +
  '  "notes": "brief note or null"\n' +
  '}'

/**
 * Maps the parsed AI payload to the RecognizeResponse contract (same defaults as the Pydantic model).
 * Throws if required fields are missing or mistyped, mirroring the Pydantic 422 behavior.
 */
export function toRecognizeResponse(data: Record<string, unknown>): RecognizeResponse {
  if (typeof data['name'] !== 'string' || typeof data['category'] !== 'string') {
    throw new Error('Missing required fields: name, category')
  }
  if (typeof data['confidence'] !== 'number') {
    throw new Error('Missing required field: confidence')
  }
  return {
    name: data['name'],
    category: data['category'],
    confidence: data['confidence'],
    platform_family: (data['platform_family'] as string | null) ?? null,
    connectivity_caps: (data['connectivity_caps'] as Record<string, boolean>) ?? {},
    technical_specs: (data['technical_specs'] as Record<string, unknown>) ?? {},
    datasheet_url: (data['datasheet_url'] as string | null) ?? null,
    notes: (data['notes'] as string | null) ?? null,
  }
}

// ---------------------------------------------------------------------------
// /api/ai/code/generate — ported 1:1 from api/main.py
// ---------------------------------------------------------------------------

export interface CodeGenerateRequest {
  project_type: string
  environment: string
  bom: BOMItem[]
  project_title: string
  mode: string // skeleton | complete
}

/** Narrows an untyped JSON body to CodeGenerateRequest, or returns null. */
export function parseCodeGenerateBody(body: unknown): CodeGenerateRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b['project_type'] !== 'string' || typeof b['environment'] !== 'string') return null
  if (typeof b['project_title'] !== 'string') return null
  const bom = parseBOMItems(b['bom'])
  if (!bom) return null
  if (b['mode'] !== undefined && typeof b['mode'] !== 'string') return null
  return { ...(body as CodeGenerateRequest), bom, mode: (b['mode'] as string) ?? 'skeleton' }
}

/** Builds the code generation prompt (port of generate_code in api/main.py). */
export function buildCodeGeneratePrompt(req: CodeGenerateRequest): string {
  const projectType = ['diy', 'prototype', 'professional'].includes(req.project_type)
    ? req.project_type
    : 'prototype'
  const bomText = req.bom
    .map(item => `- ${item.component_name} (qty: ${item.quantity_required})`)
    .join('\n')
  const modeDesc =
    req.mode === 'complete'
      ? 'a complete working implementation'
      : 'a well-structured skeleton with TODOs'

  return (
    `You are an embedded systems engineer. Generate ${modeDesc} for:\n` +
    `Project: ${req.project_title}\n` +
    `Type: ${projectType}\n` +
    `Environment: ${req.environment}\n` +
    `Components:\n${bomText}\n\n` +
    'Respond ONLY with valid JSON (no markdown):\n' +
    '{"resources":[' +
    '{"filename":"main.ino","language":"cpp","content":"...full code...","explanation":"...","dependencies":["lib1"]}' +
    ']}'
  )
}

/** Maps an untyped value to the CodeResource contract (same defaults as the Pydantic model). */
export function toCodeResource(data: unknown): CodeResource {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Resource is not an object')
  }
  const d = data as Record<string, unknown>
  if (typeof d['filename'] !== 'string') throw new Error('Missing required field: filename')
  if (typeof d['content'] !== 'string') throw new Error('Missing required field: content')
  return {
    filename: d['filename'],
    language: (d['language'] as string) ?? 'cpp',
    content: d['content'],
    explanation: (d['explanation'] as string) ?? '',
    dependencies: (d['dependencies'] as string[]) ?? [],
  }
}

/**
 * Maps the parsed AI payload to the code generation contract.
 * Throws on missing required fields, mirroring the Pydantic 422 behavior.
 */
export function toCodeGenerateResponse(data: Record<string, unknown>): {
  resources: CodeResource[]
} {
  if (!Array.isArray(data['resources'])) {
    throw new Error('Missing required field: resources')
  }
  return { resources: (data['resources'] as unknown[]).map(toCodeResource) }
}
