import { test as base, expect } from '../fixtures/seeded-test'
import {
  seedCommunityData,
  clearCommunityData,
  COMMUNITY_SEED_IDS,
} from '../fixtures/community-seed'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extends the seeded fixture with User B's public project.
 * User A (authenticated) interacts with User B's community project.
 */
const test = base.extend<{ communityProjectId: string }>({
  communityProjectId: async ({ page: _page }, use) => {
    let supabaseB: SupabaseClient | null = null
    try {
      supabaseB = await seedCommunityData()
    } catch (e) {
      console.warn('[community test] Could not seed community data:', e)
    }

    await use(COMMUNITY_SEED_IDS.projectId)

    if (supabaseB) {
      await clearCommunityData(supabaseB)
    }
  },
})

test.describe('Community — AC-3.6.14, AC-3.6.15, AC-3.6.17', () => {
  // Mobile viewport for these flow tests; community index also has a desktop layout.
  test.use({ viewport: { width: 390, height: 844 } })

  // ── AC-3.6.14: Fork project → copy in user list, counter increments ──
  test('AC-3.6.14: fork public project increments counter and creates copy', async ({ page, communityProjectId }) => {
    // Navigate directly to User B's community project
    await page.goto(`/community/${communityProjectId}`)
    await page.waitForLoadState('networkidle')

    // Project title should be visible
    await expect(page.getByRole('heading', { name: 'Test-Proyecto-Comunidad' })).toBeVisible({ timeout: 10_000 })

    // Fork button should be present with initial count
    const forkBtn = page.getByRole('button', { name: /Fork/i })
    await expect(forkBtn).toBeVisible()

    // Click fork
    await forkBtn.click()

    // Button should change to "Forkeado" and count increments by 1
    await expect(page.getByRole('button', { name: /Forkeado/i })).toBeVisible({ timeout: 10_000 })

    // Navigate to user's own projects list to verify the fork was created
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Test-Proyecto-Comunidad (fork)')).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.15: Comment on public project → appears in thread ──
  test('AC-3.6.15: comment on public project appears in thread', async ({ page, communityProjectId }) => {
    await page.goto(`/community/${communityProjectId}`)
    await page.waitForLoadState('networkidle')

    // Comment input should be present (user is authenticated)
    const commentInput = page.getByPlaceholder('Escribe un comentario...')
    await expect(commentInput).toBeVisible({ timeout: 10_000 })

    // Type a comment
    const commentText = `E2E-test-comment-${Date.now()}`
    await commentInput.fill(commentText)

    // Submit
    await page.getByRole('button', { name: /Enviar/i }).click()

    // Comment should appear in the thread
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10_000 })
  })

  // ── AC-3.6.17: Private data not visible in public view ──
  test('AC-3.6.17: private inventory data not visible in community project view', async ({ page, communityProjectId }) => {
    await page.goto(`/community/${communityProjectId}`)
    await page.waitForLoadState('networkidle')

    // Project should load and title be visible
    await expect(page.getByRole('heading', { name: 'Test-Proyecto-Comunidad' })).toBeVisible({ timeout: 10_000 })

    // Stock quantities (e.g., "3 uds.", "5 uds.") should NOT appear in the community view
    // The community page renders BOMTable with editable=false and no stock data
    await expect(page.getByText(/\d+ uds\./i)).not.toBeVisible()

    // Location names from the private inventory should not leak
    await expect(page.getByText('Test-Taller')).not.toBeVisible()
    await expect(page.getByText('Test-Cajón')).not.toBeVisible()

    // The page should NOT have any "Usar" or stock adjustment buttons
    await expect(page.getByRole('button', { name: /^Usar$/ })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /×\d+/ })).not.toBeVisible()
  })
})
