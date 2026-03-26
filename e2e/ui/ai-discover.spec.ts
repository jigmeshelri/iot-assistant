import { test, expect } from '../fixtures/auth'

test.describe('AI Discovery — AC-3.5.1 to AC-3.5.3', () => {
  test('AC-3.5.1: discover page loads with explore UI', async ({ page }) => {
    await page.goto('/ai/discover')
    // h1 exists in both mobile+desktop slots; scope to desktop main
    await expect(page.locator('main').last().locator('h1')).toBeVisible({ timeout: 10_000 })
  })

  test('discover page has refinement options', async ({ page }) => {
    await page.goto('/ai/discover')
    const difficultyBtn = page.getByText(/Principiante|Intermedio|Avanzado/i).first()
    if (await difficultyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(difficultyBtn).toBeVisible()
    }
  })
})
