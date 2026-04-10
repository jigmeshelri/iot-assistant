import { vi, describe, it, expect, beforeEach } from 'vitest'
import { resolveComponentImageUrl } from '../lib/componentImage'

type MockSupabase = {
  storage: { from: ReturnType<typeof vi.fn> }
}

const mockCreateSignedUrl = vi.fn()
const mockStorageFrom = vi.fn(() => ({ createSignedUrl: mockCreateSignedUrl }))
const mockClient: MockSupabase = { storage: { from: mockStorageFrom } }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveComponentImageUrl', () => {
  it('returns null for null input without touching storage', async () => {
    const result = await resolveComponentImageUrl(
      mockClient as unknown as Parameters<typeof resolveComponentImageUrl>[0],
      null,
    )
    expect(result).toBeNull()
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })

  it('returns null for undefined input', async () => {
    const result = await resolveComponentImageUrl(
      mockClient as unknown as Parameters<typeof resolveComponentImageUrl>[0],
      undefined,
    )
    expect(result).toBeNull()
  })

  it('returns null for empty-string input', async () => {
    const result = await resolveComponentImageUrl(
      mockClient as unknown as Parameters<typeof resolveComponentImageUrl>[0],
      '',
    )
    expect(result).toBeNull()
  })

  it('calls createSignedUrl against component-images bucket with 1h TTL', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: 'https://signed.example/x.jpg' },
      error: null,
    })
    const result = await resolveComponentImageUrl(
      mockClient as unknown as Parameters<typeof resolveComponentImageUrl>[0],
      'user-1/comp-1/x.jpg',
    )
    expect(mockStorageFrom).toHaveBeenCalledWith('component-images')
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('user-1/comp-1/x.jpg', 3600)
    expect(result).toBe('https://signed.example/x.jpg')
  })

  it('returns null when createSignedUrl returns an error', async () => {
    mockCreateSignedUrl.mockResolvedValueOnce({ data: null, error: { message: 'not found' } })
    const result = await resolveComponentImageUrl(
      mockClient as unknown as Parameters<typeof resolveComponentImageUrl>[0],
      'user-1/comp-1/x.jpg',
    )
    expect(result).toBeNull()
  })
})
