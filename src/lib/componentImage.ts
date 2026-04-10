import type { SupabaseClient } from '@supabase/supabase-js'

export const COMPONENT_IMAGES_BUCKET = 'component-images'

const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour

/**
 * Resolves a stored image path into a short-lived signed URL.
 * Accepts either a storage path (e.g. `user-id/comp-id/x.jpg`) or `null`.
 * Returns `null` when input is empty or when signing fails (errors are logged).
 */
export async function resolveComponentImageUrl(
  supabase: SupabaseClient,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from(COMPONENT_IMAGES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data) {
    console.warn('[componentImage] failed to sign url', { path, error: error?.message })
    return null
  }
  return data.signedUrl
}
