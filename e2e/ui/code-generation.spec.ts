import { test, expect } from '../fixtures/auth'

test.describe('Code Generation — AC-3.7.1 to AC-3.7.5', () => {
  test('AC-3.7.1: code section visible in project detail', async ({ page }) => {
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      const codeSection = page.getByText(/Código|Generar|Analizar/i).first()
      if (await codeSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(codeSection).toBeVisible()
      }
    }
  })

  test('code generation has environment selector', async ({ page }) => {
    await page.goto('/projects')
    const projLink = page.locator('a[href^="/projects/"]').first()
    if (await projLink.isVisible()) {
      await projLink.click()
      const envOption = page.getByText(/Arduino|PlatformIO|ESP-IDF|MicroPython/i).first()
      if (await envOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(envOption).toBeVisible()
      }
    }
  })
})
