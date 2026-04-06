# Responsive Bottom Nav Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mobile bottom nav with a responsive bar (3 tabs + "Más" on mobile, 6 tabs + "Más" on tablet) backed by a swipeable bottom sheet for overflow items.

**Architecture:** Single-file change to `src/layouts/AppLayout.astro`. The mobile `<nav>` block (lines 41-80) gets replaced with a responsive bottom bar + bottom sheet. JS logic for open/close/swipe is added to the existing `<script>` block. Desktop sidebar is untouched.

**Tech Stack:** Astro 6, Tailwind v4, Vanilla JS (touch events for swipe)

**Spec:** `docs/superpowers/specs/2026-04-05-responsive-bottom-nav-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/layouts/AppLayout.astro` | Modify | Replace mobile nav HTML (lines 41-80), add sheet markup, add JS |
| `e2e/ui/layout.spec.ts` | Modify | Update existing mobile tests + add sheet tests |

---

### Task 1: Update E2E tests for new bottom bar (RED)

**Files:**
- Modify: `e2e/ui/layout.spec.ts`

The existing "Layout móvil" tests (lines 61-84) assert 4 `<a>` tabs with names "Inicio, Inventario, Proyectos, Comunidad". These need updating to match the new structure: 3 `<a>` tabs + 1 `<button>` ("Más"), plus sheet tests.

- [ ] **Step 1: Update the existing mobile tab count test**

Replace the current "bottom nav visible con 4 tabs" test (line 64-69) and "tabs" test (line 76-83) with tests for the new structure:

```typescript
test.describe('Layout móvil', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('bottom nav visible con 3 tabs + botón Más', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(3)
    await expect(nav.getByRole('button', { name: 'Más' })).toBeVisible()
  })

  test('sidebar oculto', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeHidden()
  })

  test('tabs visibles: Inicio, Inventario, Proyectos', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Inicio')).toBeVisible()
    await expect(nav.getByText('Inventario')).toBeVisible()
    await expect(nav.getByText('Proyectos')).toBeVisible()
    // Comunidad is hidden on mobile (in sheet)
    await expect(nav.getByText('Comunidad')).toBeHidden()
  })

  test('botón Más abre bottom sheet con 6 ítems', async ({ page }) => {
    await page.goto('/')
    const moreBtn = page.getByRole('button', { name: 'Más' })
    await moreBtn.click()
    const sheet = page.locator('#bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Escanear')).toBeVisible()
    await expect(sheet.getByText('Ubicaciones')).toBeVisible()
    await expect(sheet.getByText('Comunidad')).toBeVisible()
    await expect(sheet.getByText('Tema')).toBeVisible()
    await expect(sheet.getByText('Perfil')).toBeVisible()
    await expect(sheet.getByText('Salir')).toBeVisible()
  })

  test('tap en overlay cierra bottom sheet', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    await expect(page.locator('#bottom-sheet')).toBeVisible()
    await page.locator('#sheet-overlay').click()
    await expect(page.locator('#bottom-sheet')).toBeHidden()
  })

  test('navegación desde sheet funciona', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    await page.locator('#bottom-sheet').getByText('Ubicaciones').click()
    await expect(page).toHaveURL(/\/locations/)
  })
})
```

- [ ] **Step 2: Add tablet layout tests**

Append a new describe block for tablet viewport:

```typescript
test.describe('Layout tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('bottom nav visible con 6 tabs + botón Más', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a')).toHaveCount(6)
    await expect(nav.getByRole('button', { name: 'Más' })).toBeVisible()
  })

  test('sidebar oculto en tablet', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('aside')).toBeHidden()
  })

  test('tabs tablet incluyen Escanear, Ubicaciones, Comunidad', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav.fixed')
    await expect(nav.getByText('Escanear')).toBeVisible()
    await expect(nav.getByText('Ubicaciones')).toBeVisible()
    await expect(nav.getByText('Comunidad')).toBeVisible()
  })

  test('sheet en tablet solo tiene Tema, Perfil, Salir', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Más' }).click()
    const sheet = page.locator('#bottom-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet.getByText('Tema')).toBeVisible()
    await expect(sheet.getByText('Perfil')).toBeVisible()
    await expect(sheet.getByText('Salir')).toBeVisible()
    // Nav items should NOT be in the tablet sheet
    await expect(sheet.getByText('Escanear')).toBeHidden()
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx playwright test e2e/ui/layout.spec.ts --reporter=list 2>&1 | tail -20`
Expected: Mobile and tablet tests FAIL (the HTML doesn't match yet). Desktop tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add e2e/ui/layout.spec.ts
git commit -m "test(layout): update E2E tests for responsive bottom nav with overflow sheet"
```

---

### Task 2: Replace mobile nav HTML with responsive bottom bar

**Files:**
- Modify: `src/layouts/AppLayout.astro` (lines 41-80 — mobile nav block)

- [ ] **Step 1: Replace the mobile nav block**

Replace everything from `<nav class="fixed bottom-0` (line 41) through the closing `</nav>` (line 80) with the new responsive bottom bar. The key changes:
- 3 always-visible tabs: Inicio, Inventario, Proyectos
- 3 tablet-only tabs (hidden on mobile via `hidden sm:flex`): Escanear, Ubicaciones, Comunidad
- "Más" button that opens the sheet
- Active state logic using the existing `tabClass` function for visible tabs
- "Más" gets active state when `activeTab` is `scan`, `locations`, or `community` on mobile

```astro
<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-100 z-50 pb-safe lg:hidden">
  <div class="flex items-center px-2 pt-2 pb-6">
    <!-- Always visible: Inicio -->
    <a href="/" class={tabClass('home')}>
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Inicio</span>
    </a>
    <!-- Always visible: Inventario -->
    <a href="/inventory" class={tabClass('inventory')}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
        <path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Inventario</span>
    </a>
    <!-- Tablet only: Escanear -->
    <a href="/inventory/new" class={`hidden sm:flex ${tabClass('scan')}`}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Escanear</span>
    </a>
    <!-- Always visible: Proyectos -->
    <a href="/projects" class={tabClass('projects')}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Proyectos</span>
    </a>
    <!-- Tablet only: Ubicaciones -->
    <a href="/locations" class={`hidden sm:flex ${tabClass('locations')}`}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Ubicaciones</span>
    </a>
    <!-- Tablet only: Comunidad -->
    <a href="/community" class={`hidden sm:flex ${tabClass('community')}`}>
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Comunidad</span>
    </a>
    <!-- Always visible: Más button -->
    <button
      id="more-btn"
      aria-expanded="false"
      aria-controls="bottom-sheet"
      class={`flex flex-col items-center gap-0.5 flex-1 py-2 relative ${['scan','locations','community'].includes(activeTab ?? '') ? 'text-brand-600 sm:text-slate-400' : 'text-slate-400'}`}
    >
      {['scan','locations','community'].includes(activeTab ?? '') && (
        <span class="absolute top-0.5 right-1/3 w-1.5 h-1.5 bg-brand-600 rounded-full sm:hidden" />
      )}
      <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="5" cy="12" r="1.5"/>
        <circle cx="12" cy="12" r="1.5"/>
        <circle cx="19" cy="12" r="1.5"/>
      </svg>
      <span style="font-size:10px; font-weight:500;">Más</span>
    </button>
  </div>
</nav>
```

Note: The `tabClass` function (line 19-23) already returns the right classes — we reuse it. For the tablet-only tabs, we prepend `hidden sm:flex` so they only appear at ≥ 640px.

- [ ] **Step 2: Verify unit tests still pass**

Run: `npx vitest run 2>&1 | tail -5`
Expected: All 211 tests pass (no unit tests touch layout HTML).

- [ ] **Step 3: Commit**

```bash
git add src/layouts/AppLayout.astro
git commit -m "feat(nav): replace mobile bottom bar with responsive 3+Más / 6+Más layout"
```

---

### Task 3: Add bottom sheet HTML markup

**Files:**
- Modify: `src/layouts/AppLayout.astro` (insert after the `</nav>` from Task 2, still inside the mobile layout `<div>`)

- [ ] **Step 1: Add overlay + sheet markup**

Insert the following immediately AFTER the closing `</nav>` tag of the bottom bar, but BEFORE the closing `</div>` of the mobile layout container (the `<div class="flex flex-col h-full max-w-lg...">` on line 36):

```astro
<!-- Bottom sheet overlay -->
<div
  id="sheet-overlay"
  class="fixed inset-0 bg-black/40 z-40 hidden opacity-0 transition-opacity duration-300 lg:hidden"
></div>

<!-- Bottom sheet -->
<div
  id="bottom-sheet"
  role="dialog"
  aria-modal="true"
  class="fixed bottom-[76px] left-1/2 -translate-x-1/2 w-full max-w-lg bg-white rounded-t-2xl z-50 hidden translate-y-full transition-transform duration-300 ease-out lg:hidden"
>
  <!-- Drag handle -->
  <div class="flex justify-center pt-3 pb-2" id="sheet-handle">
    <div class="w-8 h-1 bg-slate-300 rounded-full"></div>
  </div>

  <!-- Grid items -->
  <div class="grid grid-cols-3 gap-2 px-4 pb-4">
    <!-- Escanear (mobile only — hidden on tablet where it's in the bar) -->
    <a href="/inventory/new" class="sm:hidden flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
        <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      </div>
      <span class="text-xs text-slate-700 font-medium">Escanear</span>
    </a>
    <!-- Ubicaciones (mobile only) -->
    <a href="/locations" class="sm:hidden flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
        <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <span class="text-xs text-slate-700 font-medium">Ubicaciones</span>
    </a>
    <!-- Comunidad (mobile only) -->
    <a href="/community" class="sm:hidden flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
        <svg class="w-5 h-5 text-brand-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
      </div>
      <span class="text-xs text-slate-700 font-medium">Comunidad</span>
    </a>
    <!-- Tema (always in sheet) -->
    <button id="theme-toggle-sheet" class="flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
        <svg id="theme-icon-sheet-moon" class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
        <svg id="theme-icon-sheet-sun" class="w-5 h-5 text-slate-600 hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </div>
      <span class="text-xs text-slate-600 font-medium" id="theme-label-sheet">Tema</span>
    </button>
    <!-- Perfil (always in sheet) -->
    <div class="flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
        <span class="text-sm font-bold text-slate-600">{initial}</span>
      </div>
      <span class="text-xs text-slate-600 font-medium">Perfil</span>
    </div>
    <!-- Cerrar sesión (always in sheet) -->
    <button id="logout-btn-sheet" class="flex flex-col items-center gap-1 py-3 rounded-xl">
      <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </div>
      <span class="text-xs text-red-500 font-medium">Salir</span>
    </button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/layouts/AppLayout.astro
git commit -m "feat(nav): add bottom sheet markup with responsive grid items"
```

---

### Task 4: Add sheet open/close JS + swipe-to-close

**Files:**
- Modify: `src/layouts/AppLayout.astro` (the `<script>` block, lines 214-267)

- [ ] **Step 1: Add sheet open/close + swipe logic**

Add the following to the `<script>` block, AFTER the existing user-menu code (after line 266, before `</script>`):

```typescript
// ── Bottom sheet ───────────────────────────────────────────────────────
const moreBtn = document.getElementById('more-btn')
const sheet = document.getElementById('bottom-sheet')
const overlay = document.getElementById('sheet-overlay')

function openSheet() {
  if (!sheet || !overlay) return
  sheet.classList.remove('hidden')
  overlay.classList.remove('hidden')
  // Trigger reflow before adding transition classes
  sheet.offsetHeight
  sheet.classList.remove('translate-y-full')
  sheet.classList.add('translate-y-0')
  overlay.classList.remove('opacity-0')
  overlay.classList.add('opacity-100')
  moreBtn?.setAttribute('aria-expanded', 'true')
}

function closeSheet() {
  if (!sheet || !overlay) return
  sheet.classList.remove('translate-y-0')
  sheet.classList.add('translate-y-full')
  overlay.classList.remove('opacity-100')
  overlay.classList.add('opacity-0')
  moreBtn?.setAttribute('aria-expanded', 'false')
  setTimeout(() => {
    sheet.classList.add('hidden')
    overlay.classList.add('hidden')
  }, 300)
}

moreBtn?.addEventListener('click', () => {
  const isOpen = !sheet?.classList.contains('hidden')
  isOpen ? closeSheet() : openSheet()
})

overlay?.addEventListener('click', closeSheet)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !sheet?.classList.contains('hidden')) {
    closeSheet()
  }
})

// Swipe-to-close
let startY = 0
let currentY = 0
let isDragging = false

sheet?.addEventListener('touchstart', (e) => {
  startY = (e as TouchEvent).touches[0].clientY
  currentY = startY
  isDragging = true
  sheet.style.transition = 'none'
}, { passive: true })

sheet?.addEventListener('touchmove', (e) => {
  if (!isDragging) return
  currentY = (e as TouchEvent).touches[0].clientY
  const deltaY = currentY - startY
  if (deltaY > 0) {
    sheet.style.transform = `translateX(-50%) translateY(${deltaY}px)`
  }
}, { passive: true })

sheet?.addEventListener('touchend', () => {
  if (!isDragging) return
  isDragging = false
  const deltaY = currentY - startY
  sheet.style.transition = ''
  sheet.style.transform = ''
  if (deltaY > 50) {
    closeSheet()
  }
})

// Theme toggle from sheet (reuses existing applyTheme function)
document.getElementById('theme-toggle-sheet')?.addEventListener('click', () => {
  applyTheme(!document.documentElement.classList.contains('dark'))
})

// Logout from sheet (reuses existing supabase client)
document.getElementById('logout-btn-sheet')?.addEventListener('click', async () => {
  const supabase = createSupabaseBrowserClient()
  await supabase.auth.signOut()
  window.location.href = '/login'
})
```

- [ ] **Step 2: Update the existing `applyTheme` function to also update sheet icons**

Find the `applyTheme` function in the script block. Add these lines at the end of it, before the closing `}`:

```typescript
// Sheet icons / label
document.getElementById('theme-icon-sheet-sun')?.classList.toggle('hidden', !dark)
document.getElementById('theme-icon-sheet-moon')?.classList.toggle('hidden', dark)
```

- [ ] **Step 3: Remove old mobile theme toggle references**

The old mobile theme toggle button (`#theme-toggle-mobile`) no longer exists in the HTML. Remove these lines from the script:
- The `document.getElementById('theme-toggle-mobile')` event listener
- The `theme-icon-sun-mobile` / `theme-icon-moon-mobile` toggle lines in `applyTheme`
- The `theme-label-mobile` reference in `applyTheme`

- [ ] **Step 4: Run vitest**

Run: `npx vitest run 2>&1 | tail -5`
Expected: 211 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/AppLayout.astro
git commit -m "feat(nav): add sheet open/close JS with swipe-to-close and theme/logout handlers"
```

---

### Task 5: Run E2E tests (GREEN)

**Files:** None — verification only.

- [ ] **Step 1: Run layout E2E tests**

Run: `npx playwright test e2e/ui/layout.spec.ts --reporter=list 2>&1 | tail -30`
Expected: All tests pass — mobile (3 tabs + Más + sheet), tablet (6 tabs + Más + sheet), desktop (sidebar, unchanged).

- [ ] **Step 2: If tests fail, fix and iterate**

Common issues to check:
- `nav.locator('a')` count: ensure tablet-only tabs have `hidden sm:flex` so they're hidden on 390px viewport
- `#bottom-sheet` visibility: ensure `hidden` class is present by default
- Sheet overlay click: ensure `#sheet-overlay` is clickable (not behind another element)
- Transition timing: if sheet visibility check fails, add `await page.waitForTimeout(350)` after close action

- [ ] **Step 3: Run full E2E suite to catch regressions**

Run: `npx playwright test --reporter=list 2>&1 | tail -30`
Expected: No regressions in other specs.

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add src/layouts/AppLayout.astro e2e/ui/layout.spec.ts
git commit -m "fix(nav): adjust bottom sheet implementation to pass E2E tests"
```

---

### Task 6: Manual QA + cleanup

**Files:** None or minor tweaks to `src/layouts/AppLayout.astro`.

- [ ] **Step 1: Start dev server and test manually**

Run: `npm run dev`

Test on mobile viewport (Chrome DevTools → 390×844):
1. Bottom bar shows 3 tabs + "Más"
2. Click "Más" → sheet slides up with 6 items
3. Click overlay → sheet closes
4. Navigate to `/locations` → "Más" has dot indicator
5. Open sheet → click "Tema" → theme toggles

Test on tablet viewport (768×1024):
1. Bottom bar shows 6 tabs + "Más"
2. Click "Más" → sheet shows only Tema, Perfil, Salir
3. Escanear/Ubicaciones/Comunidad are NOT in the sheet

Test on desktop viewport (1280×800):
1. Sidebar visible, bottom nav hidden
2. All existing sidebar functionality works

- [ ] **Step 2: Fix any visual issues found**

Common fixes: spacing, z-index stacking, safe-area padding, transition smoothness.

- [ ] **Step 3: Final commit if any polish was needed**

```bash
git add src/layouts/AppLayout.astro
git commit -m "fix(nav): polish bottom sheet spacing and transitions"
```
