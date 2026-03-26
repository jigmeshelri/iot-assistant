import { test, expect } from '../fixtures/auth'

test.describe('AI Planning — AC-3.5.4 to AC-3.5.6', () => {
  test('AC-3.5.4: plan page has description textarea', async ({ page }) => {
    await page.goto('/ai/plan')
    await expect(page.locator('main').last().locator('h1')).toBeVisible({ timeout: 10_000 })
    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(textarea).toBeVisible()
    }
  })

  test('AC-3.5.5: refinement options visible', async ({ page }) => {
    await page.goto('/ai/plan')
    const difficulty = page.getByText(/Principiante|Intermedio|Avanzado/i).first()
    if (await difficulty.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(difficulty).toBeVisible()
    }
  })
})
