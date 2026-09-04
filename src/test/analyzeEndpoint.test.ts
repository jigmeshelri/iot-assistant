import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import { POST } from '../pages/api/ai/code/analyze'

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
  return new Request('http://localhost/api/ai/code/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  code: 'int main() {}',
  language: 'cpp',
  mode: 'review',
  project_type: 'diy',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyBearerToken.mockResolvedValue({ user: { id: 'u1' } })
  mockGetMoonshotModel.mockReturnValue('mock-model')
})

describe('POST /api/ai/code/analyze', () => {
  it('returns the auth error response when authentication fails', async () => {
    mockVerifyBearerToken.mockResolvedValue({
      error: new Response('{"detail":"Not authenticated"}', { status: 401 }),
    })
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(401)
  })

  it('returns 503 when the AI provider is not configured', async () => {
    mockGetMoonshotModel.mockReturnValue(null)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ detail: 'AI provider not configured' })
  })

  it('returns 200 with explanation and improved_code', async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"explanation":"1. Fix X","improved_code":"int main() { return 0; }"}',
    } as Awaited<ReturnType<typeof generateText>>)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      explanation: '1. Fix X',
      improved_code: 'int main() { return 0; }',
    })
  })

  it('strips markdown fences from the AI response', async () => {
    mockGenerateText.mockResolvedValue({
      text: '```json\n{"explanation":"ok","improved_code":"x"}\n```',
    } as Awaited<ReturnType<typeof generateText>>)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(200)
  })

  it('returns 422 on an invalid JSON body', async () => {
    const req = new Request('http://localhost/api/ai/code/analyze', {
      method: 'POST',
      body: 'not json',
    })
    const res = await POST(ctx(req))
    expect(res.status).toBe(422)
  })

  it('returns 422 on a null or malformed body', async () => {
    expect((await POST(ctx(jsonReq(null)))).status).toBe(422)
    expect((await POST(ctx(jsonReq({ ...validBody, mode: 'rewrite' })))).status).toBe(422)
  })

  it('returns 422 when the AI response is not parseable', async () => {
    mockGenerateText.mockResolvedValue({ text: 'sorry, cannot do that' } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(422)
    expect((await res.json()).detail).toContain('AI response parse error')
  })

  it('returns 422 when the AI response misses required fields', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"explanation":"only this"}' } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(422)
  })

  it('returns 502 when the provider call fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('provider down'))
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ detail: 'AI provider error' })
  })
})
