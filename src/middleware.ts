import { defineMiddleware } from 'astro:middleware'
import { createSupabaseServerClient } from './lib/supabase'

const PUBLIC_PATHS = ['/login', '/community', '/l/']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))
}

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }, next) => {
  const url = new URL(request.url)

  if (isPublicPath(url.pathname)) {
    return next()
  }

  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return redirect('/login')
  }

  return next()
})
