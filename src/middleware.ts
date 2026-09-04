import { defineMiddleware } from 'astro:middleware'
import { isPublicPath } from './lib/publicPaths'
import { createSupabaseServerClient } from './lib/supabase'

export const onRequest = defineMiddleware(async ({ request, cookies, redirect }, next) => {
  const url = new URL(request.url)

  if (isPublicPath(url.pathname)) {
    return next()
  }

  const supabase = createSupabaseServerClient(cookies, request)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return redirect('/login')
  }

  return next()
})
