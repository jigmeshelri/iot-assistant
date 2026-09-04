import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

async function importApi() {
  vi.resetModules()
  return import('../lib/api')
}

beforeEach(() => {
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('api (same-origin default)', () => {
  beforeEach(() => {
    vi.stubEnv('PUBLIC_API_URL', '')
  })

  it('qrImageUrl builds a relative /api/qr URL', async () => {
    const { qrImageUrl } = await importApi()
    expect(qrImageUrl('abc')).toBe('/api/qr/abc')
  })

  it('recognizeComponent posts to /api/ai/recognize with the Bearer header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'ESP32' }),
    })
    const { recognizeComponent } = await importApi()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await recognizeComponent(file, 'my-token')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/ai/recognize')
    expect(options.headers.Authorization).toBe('Bearer my-token')
  })

  it('analyzeCode posts to /api/ai/code/analyze', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ explanation: 'e', improved_code: 'c' }),
    })
    const { analyzeCode } = await importApi()

    await analyzeCode(
      { code: 'x', language: 'cpp', mode: 'review', project_type: 'diy' },
      'tok',
    )
    expect(mockFetch.mock.calls[0][0]).toBe('/api/ai/code/analyze')
  })

  it('discover/plan/generate post to the /api/ai/* paths', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const { discoverProjects, planProject, generateCode } = await importApi()

    await discoverProjects([], 'tok')
    await planProject('desc', [], null, 'tok')
    await generateCode({}, 'tok')

    expect(mockFetch.mock.calls.map(c => c[0])).toEqual([
      '/api/ai/projects/discover',
      '/api/ai/projects/plan',
      '/api/ai/code/generate',
    ])
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })
    const { recognizeComponent } = await importApi()

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(recognizeComponent(file, 'tok')).rejects.toThrow('API 500')
  })
})

describe('api (PUBLIC_API_URL override, legacy Railway transition)', () => {
  beforeEach(() => {
    vi.stubEnv('PUBLIC_API_URL', 'https://api.test.com')
  })

  it('prefixes endpoints with the override base', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    const { qrImageUrl, generateCode } = await importApi()

    expect(qrImageUrl('abc')).toBe('https://api.test.com/api/qr/abc')

    await generateCode({}, 'tok')
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.test.com/api/ai/code/generate')
  })

  it('adds https when the override has no protocol', async () => {
    vi.stubEnv('PUBLIC_API_URL', 'api.test.com/')
    const { qrImageUrl } = await importApi()
    expect(qrImageUrl('abc')).toBe('https://api.test.com/api/qr/abc')
  })
})
