import type { Session } from '@supabase/supabase-js'
import { createSupabaseBrowserClient } from './supabase'

/**
 * Returns the current Supabase session for the browser client, or null
 * when the user is not authenticated. Islands and components must use
 * this wrapper instead of touching the Supabase client directly (DIP).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Returns the current authenticated user id, or null when not signed in.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}
