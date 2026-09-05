import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ANALYZE_PROMPTS,
  buildAnalyzePrompt,
  buildCodeGeneratePrompt,
  getMoonshotModel,
  parseAiJson,
  parseAnalyzeBody,
  parseCodeGenerateBody,
  toAnalyzeResponse,
  toCodeGenerateResponse,
  toCodeResource,
  toRecognizeResponse,
  verifyBearerToken,
} from '../lib/server/ai'

const mockGetUser = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser } })),
}))

const { mockCreateAnthropic } = vi.hoisted(() => ({
  mockCreateAnthropic: vi.fn(() => (id: string) => ({ modelId: id })),
}))
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: mockCreateAnthropic,
}))

describe('parseAiJson', () => {
  it('parses plain JSON', () => {
    expect(parseAiJson('{"a": 1}')).toEqual({ a: 1 })
  })

  it('strips markdown code fences with json tag', () => {
    expect(parseAiJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 })
  })

  it('strips markdown code fences without tag', () => {
    expect(parseAiJson('```\n{"a": 1}\n```')).toEqual({ a: 1 })
  })

  it('throws on invalid JSON', () => {
    expect(() => parseAiJson('not json')).toThrow()
  })

  it('throws when the result is not a plain object', () => {
    expect(() => parseAiJson('[1, 2]')).toThrow('not a JSON object')
    expect(() => parseAiJson('"text"')).toThrow('not a JSON object')
    expect(() => parseAiJson('null')).toThrow('not a JSON object')
  })
})

describe('parseAnalyzeBody', () => {
  const valid = {
    code: 'int main() {}',
    language: 'cpp',
    mode: 'review',
    project_type: 'diy',
  }

  it('accepts a valid body', () => {
    expect(parseAnalyzeBody(valid)).toEqual(valid)
  })

  it('accepts an optional environment', () => {
    expect(parseAnalyzeBody({ ...valid, environment: 'arduino' })).toMatchObject({
      environment: 'arduino',
    })
  })

  it('rejects null and non-object bodies', () => {
    expect(parseAnalyzeBody(null)).toBeNull()
    expect(parseAnalyzeBody('code')).toBeNull()
  })

  it('rejects missing required fields', () => {
    expect(parseAnalyzeBody({ ...valid, code: 42 })).toBeNull()
    expect(parseAnalyzeBody({ ...valid, language: undefined })).toBeNull()
  })

  it('rejects unknown modes', () => {
    expect(parseAnalyzeBody({ ...valid, mode: 'rewrite' })).toBeNull()
  })

  it('rejects non-string project_type and environment', () => {
    expect(parseAnalyzeBody({ ...valid, project_type: 42 })).toBeNull()
    expect(parseAnalyzeBody({ ...valid, environment: 42 })).toBeNull()
  })
})

describe('toAnalyzeResponse', () => {
  it('maps a valid payload', () => {
    expect(toAnalyzeResponse({ explanation: 'e', improved_code: 'c' })).toEqual({
      explanation: 'e',
      improved_code: 'c',
    })
  })

  it('throws when required fields are missing or mistyped', () => {
    expect(() => toAnalyzeResponse({ explanation: 'e' })).toThrow()
    expect(() => toAnalyzeResponse({ explanation: 'e', improved_code: 42 })).toThrow()
  })
})

describe('buildAnalyzePrompt', () => {
  const base = { code: 'int main() {}', language: 'cpp' }

  it('uses the mode/project_type system instruction', () => {
    const prompt = buildAnalyzePrompt({ ...base, mode: 'optimize', project_type: 'professional' })
    expect(prompt.startsWith(ANALYZE_PROMPTS['optimize']['professional'])).toBe(true)
    expect(prompt).toContain('Language: cpp')
    expect(prompt).toContain('Code to analyze:\n```\nint main() {}\n```')
    expect(prompt).toContain('Respond ONLY with valid JSON (no markdown fences)')
  })

  it('appends the target environment hint when present', () => {
    const prompt = buildAnalyzePrompt({
      ...base,
      mode: 'review',
      project_type: 'diy',
      environment: 'esp-idf',
    })
    expect(prompt).toContain(' Target environment: esp-idf.\n\n')
  })

  it('omits the environment hint when absent', () => {
    const prompt = buildAnalyzePrompt({ ...base, mode: 'review', project_type: 'diy' })
    expect(prompt).not.toContain('Target environment')
  })

  it('falls back to prototype for unknown project_type', () => {
    const prompt = buildAnalyzePrompt({ ...base, mode: 'refactor', project_type: 'enterprise' })
    expect(prompt.startsWith(ANALYZE_PROMPTS['refactor']['prototype'])).toBe(true)
  })
})

describe('toRecognizeResponse', () => {
  it('maps a full payload', () => {
    const res = toRecognizeResponse({
      name: 'ESP32-WROOM-32',
      category: 'Microcontrolador',
      confidence: 0.95,
      platform_family: 'ESP32',
      connectivity_caps: { wifi: true },
      technical_specs: { flash: '4MB' },
      datasheet_url: 'https://example.com/ds.pdf',
      notes: 'common module',
    })
    expect(res).toEqual({
      name: 'ESP32-WROOM-32',
      category: 'Microcontrolador',
      confidence: 0.95,
      platform_family: 'ESP32',
      connectivity_caps: { wifi: true },
      technical_specs: { flash: '4MB' },
      datasheet_url: 'https://example.com/ds.pdf',
      notes: 'common module',
    })
  })

  it('applies the same defaults as the Pydantic model', () => {
    const res = toRecognizeResponse({ name: 'LED', category: 'Pasivo', confidence: 0.5 })
    expect(res.platform_family).toBeNull()
    expect(res.connectivity_caps).toEqual({})
    expect(res.technical_specs).toEqual({})
    expect(res.datasheet_url).toBeNull()
    expect(res.notes).toBeNull()
  })

  it('throws when required fields are missing, like the Pydantic model', () => {
    expect(() => toRecognizeResponse({ category: 'Pasivo', confidence: 0.5 })).toThrow()
    expect(() => toRecognizeResponse({ name: 'LED', category: 'Pasivo' })).toThrow()
  })
})

describe('getMoonshotModel', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockCreateAnthropic.mockClear()
  })

  it('returns null when MOONSHOT_API_KEY is not set', () => {
    vi.stubEnv('MOONSHOT_API_KEY', '')
    expect(getMoonshotModel()).toBeNull()
  })

  it('returns a model when MOONSHOT_API_KEY is set', () => {
    vi.stubEnv('MOONSHOT_API_KEY', 'sk-test')
    expect(getMoonshotModel()).not.toBeNull()
  })

  it('targets the Kimi Coding endpoint with the Anthropic protocol', () => {
    vi.stubEnv('MOONSHOT_API_KEY', 'sk-kimi-test')
    getMoonshotModel()
    expect(mockCreateAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: 'https://api.kimi.com/coding/v1', apiKey: 'sk-kimi-test' }),
    )
  })

  it('reads the key from import.meta.env when process.env lacks it (Astro dev)', () => {
    // Under Vitest import.meta.env is backed by process.env, so the meta-env
    // path is exercised by injecting the env objects explicitly.
    expect(getMoonshotModel({ MOONSHOT_API_KEY: 'sk-kimi-meta' }, {})).not.toBeNull()
    expect(mockCreateAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-kimi-meta' }),
    )
  })

  it('falls back to process.env when import.meta.env lacks the key (Vercel runtime)', () => {
    expect(getMoonshotModel({}, { MOONSHOT_API_KEY: 'sk-kimi-proc' })).not.toBeNull()
    expect(mockCreateAnthropic).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'sk-kimi-proc' }),
    )
  })

  it('uses MOONSHOT_MODEL when set', () => {
    vi.stubEnv('MOONSHOT_API_KEY', 'sk-test')
    vi.stubEnv('MOONSHOT_MODEL', 'custom-model')
    expect(getMoonshotModel()?.modelId).toBe('custom-model')
  })

  it('falls back to kimi-k2.5 when MOONSHOT_MODEL is unset', () => {
    vi.stubEnv('MOONSHOT_API_KEY', 'sk-test')
    vi.stubEnv('MOONSHOT_MODEL', undefined as unknown as string)
    expect(getMoonshotModel()?.modelId).toBe('kimi-k2.5')
  })
})

describe('verifyBearerToken', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    mockGetUser.mockReset()
  })

  function reqWith(headers: Record<string, string> = {}) {
    return new Request('http://localhost/api/ai/recognize', { method: 'POST', headers })
  }

  it('returns 401 when the Authorization header is missing', async () => {
    const result = await verifyBearerToken(reqWith())
    expect('error' in result && result.error.status).toBe(401)
  })

  it('returns 401 when the scheme is not Bearer', async () => {
    const result = await verifyBearerToken(reqWith({ Authorization: 'Basic abc' }))
    expect('error' in result && result.error.status).toBe(401)
  })

  it('returns 503 when Supabase is not configured', async () => {
    vi.stubEnv('PUBLIC_SUPABASE_URL', '')
    vi.stubEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    const result = await verifyBearerToken(reqWith({ Authorization: 'Bearer tok' }))
    expect('error' in result && result.error.status).toBe(503)
  })

  it('returns 401 when the token is invalid', async () => {
    vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key')
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('bad token') })
    const result = await verifyBearerToken(reqWith({ Authorization: 'Bearer tok' }))
    expect(mockGetUser).toHaveBeenCalledWith('tok')
    expect('error' in result && result.error.status).toBe(401)
  })

  it('returns the user when the token is valid', async () => {
    vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'pub-key')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const result = await verifyBearerToken(reqWith({ Authorization: 'Bearer tok' }))
    expect('user' in result && (result.user as { id: string }).id).toBe('u1')
  })
})

describe('parseCodeGenerateBody', () => {
  const valid = {
    project_type: 'diy',
    environment: 'arduino',
    bom: [{ component_name: 'ESP32', quantity_required: 1 }],
    project_title: 'Alarma',
  }

  it('accepts a valid body and defaults mode to skeleton', () => {
    expect(parseCodeGenerateBody(valid)).toMatchObject({ mode: 'skeleton' })
  })

  it('keeps an explicit mode', () => {
    expect(parseCodeGenerateBody({ ...valid, mode: 'complete' })).toMatchObject({
      mode: 'complete',
    })
  })

  it('rejects invalid bodies', () => {
    expect(parseCodeGenerateBody(null)).toBeNull()
    expect(parseCodeGenerateBody({ ...valid, project_title: 42 })).toBeNull()
    expect(parseCodeGenerateBody({ ...valid, bom: 'nope' })).toBeNull()
    expect(parseCodeGenerateBody({ ...valid, bom: [{ bad: true }] })).toBeNull()
    expect(parseCodeGenerateBody({ ...valid, mode: 42 })).toBeNull()
  })
})

describe('buildCodeGeneratePrompt', () => {
  const base = {
    project_type: 'diy',
    environment: 'arduino',
    bom: [
      {
        component_name: 'ESP32',
        quantity_required: 1,
        state: 'available' as const,
        available_quantity: 2,
        alternatives: [],
        notes: null,
      },
    ],
    project_title: 'Alarma',
    mode: 'skeleton',
  }

  it('builds the skeleton prompt with the BOM summary', () => {
    const prompt = buildCodeGeneratePrompt(base)
    expect(prompt).toContain('Generate a well-structured skeleton with TODOs for:')
    expect(prompt).toContain('Project: Alarma')
    expect(prompt).toContain('Type: diy')
    expect(prompt).toContain('Environment: arduino')
    expect(prompt).toContain('Components:\n- ESP32 (qty: 1)')
    expect(prompt).toContain('"resources":')
  })

  it('uses the complete mode description', () => {
    expect(buildCodeGeneratePrompt({ ...base, mode: 'complete' })).toContain(
      'Generate a complete working implementation for:',
    )
  })

  it('falls back to prototype for unknown project_type', () => {
    expect(buildCodeGeneratePrompt({ ...base, project_type: 'enterprise' })).toContain(
      'Type: prototype',
    )
  })
})

describe('toCodeResource', () => {
  it('maps a full resource', () => {
    expect(
      toCodeResource({
        filename: 'main.ino',
        language: 'cpp',
        content: 'void setup() {}',
        explanation: 'setup only',
        dependencies: ['WiFi'],
      }),
    ).toEqual({
      filename: 'main.ino',
      language: 'cpp',
      content: 'void setup() {}',
      explanation: 'setup only',
      dependencies: ['WiFi'],
    })
  })

  it('applies the Pydantic defaults', () => {
    expect(toCodeResource({ filename: 'a.ino', content: 'x' })).toEqual({
      filename: 'a.ino',
      language: 'cpp',
      content: 'x',
      explanation: '',
      dependencies: [],
    })
  })

  it('throws on missing required fields', () => {
    expect(() => toCodeResource({ content: 'x' })).toThrow()
    expect(() => toCodeResource({ filename: 'a' })).toThrow()
    expect(() => toCodeResource(null)).toThrow()
  })
})

describe('toCodeGenerateResponse', () => {
  it('maps the resources array', () => {
    const res = toCodeGenerateResponse({
      resources: [{ filename: 'a.ino', content: 'x' }],
    })
    expect(res.resources).toHaveLength(1)
    expect(res.resources[0].language).toBe('cpp')
  })

  it('throws when resources is missing', () => {
    expect(() => toCodeGenerateResponse({})).toThrow()
  })
})
