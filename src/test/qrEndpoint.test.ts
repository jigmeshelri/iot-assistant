import { describe, expect, it, vi } from 'vitest'
import { GET } from '../pages/api/qr/[code]'

vi.mock('../lib/server/qr', async importOriginal => {
  const actual = await importOriginal<typeof import('../lib/server/qr')>()
  return {
    ...actual,
    buildQrLabelSvg: vi.fn(async () => '<svg>mock</svg>'),
  }
})

function ctx(code: string | undefined, url = 'http://localhost/api/qr/LOC-1') {
  return {
    params: { code },
    request: new Request(url),
  } as unknown as Parameters<typeof GET>[0]
}

describe('GET /api/qr/[code]', () => {
  it('returns the SVG label with content type and cache headers', async () => {
    const res = await GET(ctx('LOC-1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/svg+xml')
    expect(res.headers.get('Cache-Control')).toContain('max-age=')
    expect(await res.text()).toBe('<svg>mock</svg>')
  })

  it('returns 404 when the code param is missing', async () => {
    const res = await GET(ctx(undefined))
    expect(res.status).toBe(404)
  })

  it('resolves the frontend URL from FRONTEND_URL or the request origin', async () => {
    const { buildQrLabelSvg } = await import('../lib/server/qr')
    await GET(ctx('LOC-1', 'https://preview.vercel.app/api/qr/LOC-1'))
    // No FRONTEND_URL in the test env: falls back to the request origin.
    expect(buildQrLabelSvg).toHaveBeenCalledWith('LOC-1', 'https://preview.vercel.app')
  })
})
