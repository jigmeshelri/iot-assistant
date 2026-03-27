import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { seedTestData, clearTestData } from './seed'

const PROJECT_REF = 'acxdmjusqhxpnewiebxn'
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`

/**
 * Playwright fixture that provides authenticated page + deterministic seed data.
 *
 * - Authenticates the test user and sets the Supabase SSR auth cookie (same as auth.ts)
 * - Seeds: 1 location (Test-Taller), 1 sub-location (Test-Cajón), 4 components with
 *   stock (ESP32-C6 XIAO, DHT22, Servo SG90, TP4056), 1 project with BOM entry
 * - Cleans up all TEST- prefixed data after each test
 *
 * Uses the publishable (anon) key — respects RLS.
 */
export const test = base.extend<{ page: import('@playwright/test').Page }>({
  page: async ({ page }, use) => {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const email = process.env.TEST_USER_EMAIL
    const password = process.env.TEST_USER_PASSWORD

    if (!supabaseUrl || !supabaseKey || !email || !password) {
      console.warn('[seeded fixture] Missing env vars — running unauthenticated without seed data')
      await use(page)
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error || !data.session || !data.user) {
      console.warn(`[seeded fixture] Sign-in failed: ${error?.message} — running unauthenticated without seed data`)
      await use(page)
      return
    }

    // Set auth cookie so the Astro SSR layer recognises the session
    await page.context().addCookies([
      {
        name: AUTH_COOKIE_NAME,
        value: JSON.stringify(data.session),
        domain: 'localhost',
        path: '/',
        httpOnly: false,
        secure: false,
      },
    ])

    await seedTestData(supabase, data.user.id)

    await use(page)

    await clearTestData(supabase, data.user.id)
  },
})

export { expect }
