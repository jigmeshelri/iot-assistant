import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '../../lib/supabase'

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = createSupabaseServerClient(cookies, request)
    await supabase.auth.exchangeCodeForSession(code)
  }

  return redirect('/')
}
