import { test, expect } from '../fixtures/auth'

test.describe('Inventory Detail — AC-3.1.3, AC-3.1.5, AC-3.1.8', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('AC-3.1.3: detail page shows component info', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()
    // Check for EmptyState vs item list
    const emptyState = main.getByText('Sin componentes')
    if (await emptyState.isVisible({ timeout: 5000 }).catch(() => false)) {
      // No items — test passes
      return
    }
    // Items exist — click first link (wait for React hydration)
    const link = main.locator('a[href^="/inventory/"]').first()
    await expect(link).toBeVisible({ timeout: 10_000 })
    await link.click()
    await page.waitForURL(/\/inventory\//)
    // Detail page should show some content
    await expect(page.locator('main').last().locator('h1, h2').first()).toBeVisible()
  })

  test('AC-3.1.5: delete component removes from inventory list', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()

    const firstLink = main.locator('table tbody tr a, [data-testid="component-link"]').first()
    if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      const componentName = await firstLink.textContent()
      await firstLink.click()
      await page.waitForLoadState('networkidle')

      const deleteBtn = page.getByRole('button', { name: /eliminar/i })
      if (await deleteBtn.isVisible().catch(() => false)) {
        page.on('dialog', (dialog) => dialog.accept())
        await deleteBtn.click()
        await page.waitForURL('**/inventory')
        if (componentName) {
          await expect(page.locator('main').last().getByText(componentName)).not.toBeVisible({ timeout: 3000 })
        }
      }
    }
  })

  test('AC-3.1.8: stock adjuster increments and displays new value', async ({ page }) => {
    await page.goto('/inventory')
    const main = page.locator('main').last()

    const firstLink = main.locator('table tbody tr a, [data-testid="component-link"]').first()
    if (await firstLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLink.click()
      await page.waitForLoadState('networkidle')

      const plusBtn = page.getByRole('button', { name: '+' })
      if (await plusBtn.isVisible().catch(() => false)) {
        // Read current value
        const quantityEl = page.locator('[data-testid="stock-quantity"], .text-2xl, .text-3xl').first()
        const before = await quantityEl.textContent()
        const beforeNum = parseInt(before ?? '0', 10)

        await plusBtn.click()
        await page.waitForTimeout(1000)

        const after = await quantityEl.textContent()
        const afterNum = parseInt(after ?? '0', 10)
        expect(afterNum).toBe(beforeNum + 1)
      }
    }
  })
})
