import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import { POST } from '../pages/api/ai/projects/discover'

vi.mock('ai', () => ({ generateText: vi.fn() }))

const mockVerifyBearerToken = vi.fn()
const mockGetMoonshotModel = vi.fn()
vi.mock('../lib/server/ai', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/server/ai')>()
  return {
    ...actual,
    getMoonshotModel: () => mockGetMoonshotModel(),
    verifyBearerToken: (req: Request) => mockVerifyBearerToken(req),
  }
})

const mockGenerateText = vi.mocked(generateText)

function ctx(request: Request) {
  return { request } as Parameters<typeof POST>[0]
}

function jsonReq(body: unknown) {
  return new Request('http://localhost/api/ai/projects/discover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const inventory = [
  { component_id: 'c1', name: 'ESP32', category: 'Microcontrolador', quantity: 2 },
]

const suggestion = (title: string, viability_pct: number) => ({
  title,
  description: 'desc',
  viability_pct,
  difficulty: 'beginner',
  project_type: 'diy',
  tags: [],
  bom: [{ component_name: 'ESP32', quantity_required: 1 }],
})

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyBearerToken.mockResolvedValue({ user: { id: 'u1' } })
  mockGetMoonshotModel.mockReturnValue('mock-model')
})

describe('POST /api/ai/projects/discover', () => {
  it('returns the auth error response when authentication fails', async () => {
    mockVerifyBearerToken.mockResolvedValue({
      error: new Response('{"detail":"Not authenticated"}', { status: 401 }),
    })
    const res = await POST(ctx(jsonReq({ inventory })))
    expect(res.status).toBe(401)
  })

  it('returns 503 when the AI provider is not configured', async () => {
    mockGetMoonshotModel.mockReturnValue(null)
    const res = await POST(ctx(jsonReq({ inventory })))
    expect(res.status).toBe(503)
  })

  it('returns 200 with suggestions sorted by viability desc, top 5', async () => {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        suggestions: [10, 90, 50, 99, 30, 70].map(v => suggestion(`p${v}`, v)),
      }),
    } as Awaited<ReturnType<typeof generateText>>)
    const res = await POST(ctx(jsonReq({ inventory })))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.suggestions.map((s: { viability_pct: number }) => s.viability_pct)).toEqual([
      99, 90, 70, 50, 30,
    ])
  })

  it('returns 422 on an invalid JSON body', async () => {
    const req = new Request('http://localhost/api/ai/projects/discover', {
      method: 'POST',
      body: 'not json',
    })
    expect((await POST(ctx(req))).status).toBe(422)
  })

  it('returns 422 on a malformed inventory', async () => {
    expect((await POST(ctx(jsonReq(null)))).status).toBe(422)
    expect((await POST(ctx(jsonReq({ inventory: 'nope' })))).status).toBe(422)
    expect((await POST(ctx(jsonReq({ inventory: [{ bad: true }] })))).status).toBe(422)
  })

  it('returns 422 when the AI response is not parseable', async () => {
    mockGenerateText.mockResolvedValue({ text: 'nope' } as Awaited<
      ReturnType<typeof generateText>
    >)
    expect((await POST(ctx(jsonReq({ inventory })))).status).toBe(422)
  })

  it('returns 422 when the AI response misses the suggestions contract', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"other": 1}' } as Awaited<
      ReturnType<typeof generateText>
    >)
    expect((await POST(ctx(jsonReq({ inventory })))).status).toBe(422)
  })

  it('returns 502 when the provider call fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('provider down'))
    const res = await POST(ctx(jsonReq({ inventory })))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ detail: 'AI provider error' })
  })
})
