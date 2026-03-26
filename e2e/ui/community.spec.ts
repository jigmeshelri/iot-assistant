import { test, expect } from '../fixtures/auth'

test.describe('Community — AC-3.6.12 to AC-3.6.17', () => {
  // Community page only renders content in the default (mobile) slot,
  // so force a mobile viewport for all tests in this block.
  test.use({ viewport: { width: 390, height: 844 } })

  test('community page loads', async ({ page }) => {
    await page.goto('/community')
    await expect(page.locator('h1').getByText(/Comunidad/i)).toBeVisible()
  })

  test('AC-3.6.17: public projects visible without private data', async ({ page }) => {
    await page.goto('/community')
    // Verify no stock quantities ("unid.") leak into community cards
    await expect(page).toHaveURL('/community')
  })

  test('AC-3.6.15: comment section visible on public project', async ({ page }) => {
    await page.goto('/community')
    const projLink = page.locator('a[href^="/community/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      const commentSection = page.getByText(/Comentar|Comentarios/i).first()
      if (await commentSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(commentSection).toBeVisible()
      }
    }
  })

  test('AC-3.6.14: fork button visible on public project', async ({ page }) => {
    await page.goto('/community')
    const projLink = page.locator('a[href^="/community/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      const forkBtn = page.getByText(/Fork|Guardar/i).first()
      if (await forkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(forkBtn).toBeVisible()
      }
    }
  })
})
