import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockCreateBrowserClient = vi.fn().mockReturnValue({ auth: {} })
const mockCreateServerClient = vi.fn().mockReturnValue({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
  },
})

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
  createServerClient: mockCreateServerClient,
}))

// Mock import.meta.env
vi.stubEnv('PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-anon-key')

describe('supabase lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createSupabaseBrowserClient calls createBrowserClient with correct args', async () => {
    const { createSupabaseBrowserClient } = await import('../lib/supabase')
    createSupabaseBrowserClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('createSupabaseServerClient calls createServerClient with cookie adapter', async () => {
    const { createSupabaseServerClient } = await import('../lib/supabase')

    const mockCookies = {
      set: vi.fn(),
    }
    const mockRequest = new Request('https://test.com', {
      headers: { cookie: 'sb-token=abc123; other=val' },
    })

    createSupabaseServerClient(mockCookies as never, mockRequest)

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )

    // Test the cookie adapter's getAll
    const cookiesArg = mockCreateServerClient.mock.calls[0][2].cookies
    const result = cookiesArg.getAll()
    expect(result).toEqual([
      { name: 'sb-token', value: 'abc123' },
      { name: 'other', value: 'val' },
    ])

    // Test setAll
    cookiesArg.setAll([
      { name: 'test', value: 'val', options: { path: '/' } },
    ])
    expect(mockCookies.set).toHaveBeenCalledWith('test', 'val', { path: '/' })
  })

  it('getSession returns session from server client', async () => {
    const { getSession } = await import('../lib/supabase')

    const mockCookies = { set: vi.fn() }
    const mockRequest = new Request('https://test.com')

    const session = await getSession(mockCookies as never, mockRequest)
    expect(session).toEqual({ access_token: 'tok' })
  })

  it('getUser returns user from server client', async () => {
    const { getUser } = await import('../lib/supabase')

    const mockCookies = { set: vi.fn() }
    const mockRequest = new Request('https://test.com')

    const user = await getUser(mockCookies as never, mockRequest)
    expect(user).toEqual({ id: 'u1' })
  })

  it('cookie adapter handles empty cookie header', async () => {
    const { createSupabaseServerClient } = await import('../lib/supabase')

    const mockCookies = { set: vi.fn() }
    const mockRequest = new Request('https://test.com') // no cookie header

    createSupabaseServerClient(mockCookies as never, mockRequest)

    const cookiesArg = mockCreateServerClient.mock.calls[0][2].cookies
    const result = cookiesArg.getAll()
    expect(result).toEqual([])
  })
})
