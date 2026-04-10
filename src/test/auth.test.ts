import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockGetUser = vi.fn()

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: mockGetSession, getUser: mockGetUser },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getCurrentSession', () => {
  it('returns the session when authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'tok-1', user: { id: 'user-1' } } },
    })
    const { getCurrentSession } = await import('../lib/auth')
    const result = await getCurrentSession()
    expect(result?.access_token).toBe('tok-1')
  })

  it('returns null when not authenticated', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } })
    const { getCurrentSession } = await import('../lib/auth')
    const result = await getCurrentSession()
    expect(result).toBeNull()
  })
})

describe('getCurrentUserId', () => {
  it('returns the user id when authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-42' } } })
    const { getCurrentUserId } = await import('../lib/auth')
    const result = await getCurrentUserId()
    expect(result).toBe('user-42')
  })

  it('returns null when not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } })
    const { getCurrentUserId } = await import('../lib/auth')
    const result = await getCurrentUserId()
    expect(result).toBeNull()
  })
})
