import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

export const test = base.extend<{ page: import('@playwright/test').Page }>({
  page: async ({ page }, use) => {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const email = process.env.TEST_USER_EMAIL!
    const password = process.env.TEST_USER_PASSWORD!

    if (supabaseUrl && supabaseKey && email && password) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase.auth.signInWithPassword({ email, password })

      if (data.session) {
        // Inject session cookies so Astro SSR recognizes the user
        await page.context().addCookies([
          {
            name: 'sb-access-token',
            value: data.session.access_token,
            domain: 'localhost',
            path: '/',
          },
          {
            name: 'sb-refresh-token',
            value: data.session.refresh_token!,
            domain: 'localhost',
            path: '/',
          },
        ])
      }
    }

    await use(page)
  },
})

export { expect }
