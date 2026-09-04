import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import { POST } from '../pages/api/ai/code/generate'

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
  return new Request('http://localhost/api/ai/code/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  project_type: 'diy',
  environment: 'arduino',
  bom: [{ component_name: 'ESP32', quantity_required: 1 }],
  project_title: 'Alarma',
}

const generatePayload = {
  resources: [
    {
      filename: 'main.ino',
      language: 'cpp',
      content: 'void setup() {}',
      explanation: 'setup',
      dependencies: [],
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyBearerToken.mockResolvedValue({ user: { id: 'u1' } })
  mockGetMoonshotModel.mockReturnValue('mock-model')
})

describe('POST /api/ai/code/generate', () => {
  it('returns the auth error response when authentication fails', async () => {
    mockVerifyBearerToken.mockResolvedValue({
      error: new Response('{"detail":"Not authenticated"}', { status: 401 }),
    })
    expect((await POST(ctx(jsonReq(validBody)))).status).toBe(401)
  })

  it('returns 503 when the AI provider is not configured', async () => {
    mockGetMoonshotModel.mockReturnValue(null)
    expect((await POST(ctx(jsonReq(validBody)))).status).toBe(503)
  })

  it('returns 200 with the resources contract', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(generatePayload) } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(generatePayload)
  })

  it('requests 8192 output tokens', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(generatePayload) } as Awaited<
      ReturnType<typeof generateText>
    >)
    await POST(ctx(jsonReq(validBody)))
    expect(mockGenerateText.mock.calls[0][0]).toMatchObject({ maxOutputTokens: 8192 })
  })

  it('returns 422 on an invalid JSON body', async () => {
    const req = new Request('http://localhost/api/ai/code/generate', {
      method: 'POST',
      body: 'not json',
    })
    expect((await POST(ctx(req))).status).toBe(422)
  })

  it('returns 422 on a malformed body', async () => {
    expect((await POST(ctx(jsonReq(null)))).status).toBe(422)
    expect((await POST(ctx(jsonReq({ ...validBody, project_title: 1 })))).status).toBe(422)
  })

  it('returns 422 when the AI response is not parseable or incomplete', async () => {
    mockGenerateText.mockResolvedValue({ text: 'nope' } as Awaited<
      ReturnType<typeof generateText>
    >)
    expect((await POST(ctx(jsonReq(validBody)))).status).toBe(422)

    mockGenerateText.mockResolvedValue({ text: '{"resources":[{"filename":"a"}]}' } as Awaited<
      ReturnType<typeof generateText>
    >)
    expect((await POST(ctx(jsonReq(validBody)))).status).toBe(422)
  })

  it('returns 502 when the provider call fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('provider down'))
    const res = await POST(ctx(jsonReq(validBody)))
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ detail: 'AI provider error' })
  })
})
