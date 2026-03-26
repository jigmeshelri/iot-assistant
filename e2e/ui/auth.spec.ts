import { test, expect } from '../fixtures/auth'

test.describe('Auth — AC-4.1, AC-4.3', () => {
  test('AC-4.3: login page shows OAuth and magic link options', async ({ browser }) => {
    // Use fresh context without auth cookies so we actually see the login form
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/login')
    // OAuth buttons
    await expect(page.locator('#google-btn')).toBeVisible()
    await expect(page.locator('#github-btn')).toBeVisible()
    // Magic link input
    await expect(page.locator('#email-input')).toBeVisible()
    await context.close()
  })

  test('AC-4.1: protected route redirects to login when unauthenticated', async ({ browser }) => {
    // Create fresh context without auth cookies
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto('/inventory')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
    await context.close()
  })
})
