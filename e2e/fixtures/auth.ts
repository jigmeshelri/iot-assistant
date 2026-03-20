import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const PROJECT_REF = 'acxdmjusqhxpnewiebxn'
// Supabase SSR v0.5+ uses this cookie name (chunked JSON session)
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`

export const test = base.extend<{ page: import('@playwright/test').Page }>({
  page: async ({ page }, use) => {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (supabaseUrl && supabaseKey && email && password) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        console.warn(`[auth fixture] Sign-in failed: ${error.message} — tests will run unauthenticated`)
      } else if (data.session) {
        // Supabase SSR serializes the session as JSON in a single cookie
        const sessionJson = JSON.stringify(data.session)
        await page.context().addCookies([
          {
            name: AUTH_COOKIE_NAME,
            value: sessionJson,
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false,
          },
        ])
      }
    } else {
      console.warn('[auth fixture] Missing env vars (TEST_USER_EMAIL, TEST_USER_PASSWORD) — tests will run unauthenticated')
    }

    await use(page)
  },
})

export { expect }
