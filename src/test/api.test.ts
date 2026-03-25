import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.stubEnv('PUBLIC_API_URL', 'https://api.test.com')

const mockFetch = vi.fn()
global.fetch = mockFetch

let qrImageUrl: typeof import('../lib/api').qrImageUrl
let recognizeComponent: typeof import('../lib/api').recognizeComponent

beforeEach(async () => {
  vi.resetModules()
  mockFetch.mockReset()
  const mod = await import('../lib/api')
  qrImageUrl = mod.qrImageUrl
  recognizeComponent = mod.recognizeComponent
})

describe('api', () => {
  it('qrImageUrl constructs correct URL', () => {
    const url = qrImageUrl('abc')
    expect(url).toContain('/qr/abc')
  })

  it('recognizeComponent includes Authorization header', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'ESP32' }),
    })

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await recognizeComponent(file, 'my-token')

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer my-token')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    })

    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    await expect(recognizeComponent(file, 'tok')).rejects.toThrow('API 500')
  })
})
