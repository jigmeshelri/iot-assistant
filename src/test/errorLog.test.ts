import { vi, describe, it, expect, beforeEach } from 'vitest'
import { funErrorMessage, logError } from '../lib/errorLog'

const mockInsert = vi.fn().mockResolvedValue({ error: null })
const mockGetUser = vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } })

vi.mock('../lib/supabase', () => ({
  createSupabaseBrowserClient: () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
    auth: { getUser: mockGetUser },
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('funErrorMessage', () => {
  it('returns fun message for auth errors', () => {
    const msg = funErrorMessage('401 Unauthorized')
    expect(msg).toContain('sesión expiró')
  })

  it('returns fun message for timeout errors', () => {
    const msg = funErrorMessage('Request timed out')
    expect(msg).toContain('dormida')
  })

  it('returns fun message for network errors', () => {
    const msg = funErrorMessage('Failed to fetch')
    expect(msg).toContain('Señal perdida')
  })

  it('returns fun message for 500 errors', () => {
    const msg = funErrorMessage('500 internal server error')
    expect(msg).toContain('cortocircuito')
  })

  it('returns default fun message for unknown errors', () => {
    const msg = funErrorMessage('something completely unknown xyz')
    expect(msg).toContain('robot pide disculpas')
  })
})

describe('logError', () => {
  it('inserts error to supabase', async () => {
    await logError('test_context', new Error('boom'), { extra: 'data' })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        context: 'test_context',
        message: 'boom',
        user_id: 'u1',
        detail: expect.objectContaining({
          extra: 'data',
          timestamp: expect.any(String),
        }),
      })
    )
  })

  it('falls back to console.error when supabase fails', async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: 'DB down' } })
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await logError('fail_ctx', 'string error')

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[errorLog]'),
      expect.anything()
    )
    consoleSpy.mockRestore()
  })

  it('handles non-Error objects', async () => {
    await logError('ctx', 'raw string error')

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'raw string error',
      })
    )
  })
})
