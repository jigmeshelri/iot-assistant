import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { AstroCookies } from 'astro'

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string

/** Browser client — use inside React Islands */
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
}

/**
 * Server client — use inside Astro pages and middleware.
 * Requires both `Astro.cookies` and `Astro.request` (or `request` from middleware context).
 */
export function createSupabaseServerClient(cookies: AstroCookies, request: Request) {
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        const header = request.headers.get('cookie') ?? ''
        return header.split(';').flatMap(pair => {
          const trimmed = pair.trim()
          if (!trimmed) return []
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx === -1) return []
          return [{ name: trimmed.slice(0, eqIdx), value: trimmed.slice(eqIdx + 1) }]
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, options)
        )
      },
    },
  })
}

/** Update stock quantity — returns error message string or null on success */
export async function updateStockQuantity(stockId: string, quantity: number): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.from('stock').update({ quantity }).eq('id', stockId)
  return error ? error.message : null
}

/** Get current browser session (use inside React Islands) */
export async function getBrowserSession() {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Shorthand to get session from Astro page context */
export async function getSession(cookies: AstroCookies, request: Request) {
  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Shorthand to get authenticated user (server-verified, recommended for SSR) */
export async function getUser(cookies: AstroCookies, request: Request) {
  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** Get the current browser session's access token. Throws if not authenticated. */
export async function getAuthToken(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return session.access_token
}
