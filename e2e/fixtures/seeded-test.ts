import { test as base, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { seedTestData, clearTestData, SEED_IDS, type SeedIds } from './seed'
import { wireAiRoutesForPage } from './ai-mock'

const PROJECT_REF = 'acxdmjusqhxpnewiebxn'
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`

/**
 * Context exposed to specs using this fixture.
 *
 * - `page`   — authenticated Playwright page with seed data ready
 * - `ids`    — typed references to every seeded entity (project, locations, components…)
 */
export type SeededTestFixtures = {
  page: import('@playwright/test').Page
  ids: SeedIds
}

/**
 * Playwright fixture that provides:
 * - Authenticated page (User A, same as auth.ts)
 * - Deterministic seed data (locations, components, stock, project, BOM, log entries, code resource)
 * - AI route mocking applied by default (high confidence)
 * - Typed `ids` object so specs can reference seeded entities without magic strings
 * - Full cleanup after each test
 *
 * Backward compatible: specs that only destructure `{ page }` continue to work.
 */
export const test = base.extend<SeededTestFixtures>({
  // eslint-disable-next-line no-empty-pattern
  ids: [async ({}, use) => {
    await use(SEED_IDS)
  }, { option: false }],

  page: async ({ page }, use) => {
    const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
    const email       = process.env.TEST_USER_EMAIL
    const password    = process.env.TEST_USER_PASSWORD

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

    // Wire AI route mocks (high confidence) before the page is used
    await wireAiRoutesForPage(page, 0.95)

    await seedTestData(supabase, data.user.id)

    await use(page)

    await clearTestData(supabase, data.user.id)
  },
})

export { expect }
