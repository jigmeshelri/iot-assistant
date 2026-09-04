import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateText } from 'ai'
import { POST } from '../pages/api/ai/recognize'

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
  return { request } as unknown as Parameters<typeof POST>[0]
}

const recognizePayload = {
  name: 'ESP32-WROOM-32',
  category: 'Microcontrolador',
  confidence: 0.95,
  platform_family: 'ESP32',
  connectivity_caps: { wifi: true, bluetooth: true },
  technical_specs: { flash: '4MB' },
  datasheet_url: null,
  notes: null,
}

function multipartReq(file?: File) {
  const form = new FormData()
  if (file) form.append('file', file)
  return new Request('http://localhost/api/ai/recognize', { method: 'POST', body: form })
}

const imageFile = () =>
  new File([new Uint8Array([0xff, 0xd8, 0xff])], 'board.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifyBearerToken.mockResolvedValue({ user: { id: 'u1' } })
  mockGetMoonshotModel.mockReturnValue('mock-model')
})

describe('POST /api/ai/recognize', () => {
  it('returns the auth error response when authentication fails', async () => {
    mockVerifyBearerToken.mockResolvedValue({
      error: new Response('{"detail":"Not authenticated"}', { status: 401 }),
    })
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(401)
  })

  it('returns 503 when the AI provider is not configured', async () => {
    mockGetMoonshotModel.mockReturnValue(null)
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ detail: 'AI provider not configured' })
  })

  it('returns 200 with the RecognizeResponse contract', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(recognizePayload) } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(recognizePayload)
  })

  it('sends the image bytes and prompt to the model', async () => {
    mockGenerateText.mockResolvedValue({ text: JSON.stringify(recognizePayload) } as Awaited<
      ReturnType<typeof generateText>
    >)
    await POST(ctx(multipartReq(imageFile())))
    const call = mockGenerateText.mock.calls[0][0] as {
      messages: { role: string; content: { type: string; mediaType?: string }[] }[]
    }
    const parts = call.messages[0].content
    expect(parts[0]).toMatchObject({ type: 'image', mediaType: 'image/jpeg' })
    expect(parts[1].type).toBe('text')
  })

  it('returns 422 when the multipart body cannot be parsed', async () => {
    const brokenReq = {
      formData: () => Promise.reject(new Error('malformed multipart')),
    }
    const res = await POST(ctx(brokenReq as unknown as Request))
    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({ detail: 'Invalid multipart body' })
  })

  it('returns 422 when the file field is missing', async () => {
    const res = await POST(ctx(multipartReq()))
    expect(res.status).toBe(422)
  })

  it('returns 422 when the AI response is not parseable', async () => {
    mockGenerateText.mockResolvedValue({ text: 'not json' } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(422)
  })

  it('returns 422 when the AI response misses required fields', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"category":"Sensor"}' } as Awaited<
      ReturnType<typeof generateText>
    >)
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(422)
  })

  it('returns 502 when the provider call fails', async () => {
    mockGenerateText.mockRejectedValue(new Error('provider down'))
    const res = await POST(ctx(multipartReq(imageFile())))
    expect(res.status).toBe(502)
  })
})
