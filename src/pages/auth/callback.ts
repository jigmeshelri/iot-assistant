import type { APIRoute } from 'astro'
import { createSupabaseServerClient } from '../../lib/supabase'

export const GET: APIRoute = async ({ url, cookies, request, redirect }) => {
  const code = url.searchParams.get('code')

  if (code) {
    const supabase = createSupabaseServerClient(cookies, request)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return redirect('/login?error=auth_callback_failed')
    }
  }

  return redirect('/')
}
