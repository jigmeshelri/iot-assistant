import { test, expect } from '../fixtures/auth'

test.describe('Auth — AC-4.1, AC-4.3', () => {
  test('AC-4.3: login page shows OAuth and magic link options', async ({ page }) => {
    await page.goto('/login')
    // OAuth buttons
    await expect(page.getByText(/Google/i)).toBeVisible()
    await expect(page.getByText(/GitHub/i)).toBeVisible()
    // Magic link input
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
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
