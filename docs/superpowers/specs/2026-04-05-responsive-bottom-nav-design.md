# Responsive Bottom Nav with Overflow Sheet

## Summary

Replace the current 5-item fixed mobile bottom bar with a responsive bottom navigation that adapts to screen width. On mobile (< 640px), 3 primary tabs are visible with a "Más" overflow button that opens a bottom sheet with secondary items. On tablet (640px–1023px), all 6 navigation items are visible in the bar, and "Más" only contains account/settings actions. Desktop (≥ 1024px) keeps the existing sidebar unchanged.

## Motivation

The current mobile nav shows 5 items (Inicio, Inventario, Proyectos, Comunidad, Tema toggle) but is missing Escanear IA, Ubicaciones, and Perfil — all of which exist in the desktop sidebar. Adding all items to the bottom bar would overcrowd it on small screens. The overflow pattern solves this by showing the most important tabs directly and grouping secondary items behind a "Más" button.

## Breakpoints

### Mobile (< 640px)

**Bottom bar (4 items):** Inicio, Inventario, Proyectos, Más

**Bottom sheet (6 items, grid 3×2):**
| Row 1 | Row 2 |
|-------|-------|
| Escanear IA → `/inventory/new` | Tema (toggle) |
| Ubicaciones → `/locations` | Perfil (placeholder — no route exists yet, shows user initial + name, non-navigable) |
| Comunidad → `/community` | Cerrar sesión (action) |

### Tablet (640px–1023px)

**Bottom bar (7 items):** Inicio, Inventario, Escanear, Proyectos, Ubicaciones, Comunidad, Más

**Bottom sheet (3 items, grid 3×1):** Tema, Perfil, Cerrar sesión

### Desktop (≥ 1024px)

No changes. Existing sidebar with all navigation items, theme toggle, and user menu.

## Bottom Bar Behavior

- Fixed to bottom of viewport, inside `max-w-lg` container on mobile
- Active tab highlighted with `text-brand-600` (same as current)
- When user is on a route that lives inside "Más" (e.g., `/locations`, `/community` on mobile), the "Más" button shows as active with a dot indicator above the icon
- Tabs hidden on mobile appear via `sm:flex` (Tailwind's 640px breakpoint)
- The "Más" button is always a `<button>`, not an `<a>` — it opens the sheet, not a route

## Bottom Sheet Behavior

### Opening
- Triggered by tapping the "Más" button in the bottom bar
- Sheet slides up from below the nav bar with CSS transition: `transform: translateY(100%)` → `translateY(0)`, `opacity: 0` → `1`
- Semi-transparent overlay (`bg-black/40`) covers the content area above
- Transition duration: 300ms ease-out

### Closing
- **Tap overlay**: clicking the dark overlay closes the sheet
- **Swipe down**: dragging the sheet downward past a threshold (50px) closes it
- Sheet slides back down with reverse transition (200ms ease-in)
- Pressing Escape also closes the sheet

### Sheet Structure
- Anchored above the bottom nav bar (not above the viewport bottom)
- Rounded top corners (`rounded-t-2xl`)
- Drag handle bar at top (32px wide, 4px tall, `bg-slate-300`, centered)
- Grid layout adapts: 3×2 on mobile, 3×1 on tablet
- Each item: icon in rounded container (40×40px, `bg-brand-50` for nav items, `bg-slate-100` for settings, `bg-red-50` for logout) + label below (10px)
- "Cerrar sesión" uses red color treatment (`text-red-500`)

### Swipe-to-close Implementation
- Track `touchstart` / `touchmove` / `touchend` events on the sheet element
- On `touchmove`: translate the sheet downward following the finger (only allow downward movement)
- On `touchend`: if deltaY > 50px, close the sheet; otherwise snap back to open position
- CSS `will-change: transform` for smooth animation during drag

## Active State Logic

The `activeTab` prop already supports: `home | inventory | projects | community | scan | locations`

Mapping to bottom bar highlighting:
- `home` → Inicio tab active
- `inventory` → Inventario tab active
- `projects` → Proyectos tab active
- `scan` → Más dot indicator (mobile) / Escanear tab active (tablet)
- `locations` → Más dot indicator (mobile) / Ubicaciones tab active (tablet)
- `community` → Más dot indicator (mobile) / Comunidad tab active (tablet)

On mobile, when `activeTab` is `scan`, `locations`, or `community`, the "Más" button shows `text-brand-600` with a small dot (`w-1.5 h-1.5 bg-brand-600 rounded-full`) positioned above the icon.

## Implementation

### Approach
Vanilla JS in `AppLayout.astro`, consistent with the existing theme toggle and user menu patterns. No React island needed.

### File Changed
`src/layouts/AppLayout.astro` — the only file modified. Specifically:
- **HTML**: Replace the current mobile `<nav>` block (lines 41-80) with the new responsive bottom bar + sheet markup
- **JS**: Add sheet open/close logic and swipe handling to the existing `<script>` block
- **CSS**: Inline styles or Tailwind classes only — no new CSS file

### What Gets Removed
- The current Comunidad tab from the bottom bar (moves to sheet on mobile, stays in bar on tablet)
- The theme toggle button from the bottom bar (moves to sheet at all sizes)

### What Gets Added
- "Más" button with three-dot icon
- Bottom sheet overlay + container + grid items
- Swipe-to-close touch handler (~30 lines JS)
- Responsive visibility classes (`hidden sm:flex` / `sm:hidden`) for adaptive tabs
- Dot indicator for secondary-route active state

### What Stays the Same
- Desktop sidebar (lines 84-192) — untouched
- Desktop script logic (theme toggle, user menu, logout) — untouched
- The `activeTab` prop interface — no changes to the type
- The `pb-safe` padding for iOS safe area
- The `max-w-lg` container constraint

## Accessibility

- Sheet overlay gets `role="dialog"` and `aria-modal="true"`
- Focus trapped inside sheet when open
- Escape key closes the sheet
- "Más" button gets `aria-expanded` and `aria-controls` attributes
- Sheet items are keyboard navigable (Tab / Enter)

## Edge Cases

- **Rapid tap**: Opening and immediately closing should not cause animation glitches. Use a `pointer-events: none` guard during transitions.
- **Orientation change**: If tablet rotates from landscape to portrait (crossing the `sm:` breakpoint), the bar adapts via CSS — no JS needed.
- **Desktop resize**: If window shrinks below `lg:`, the sidebar hides and bottom bar appears. The sheet state resets to closed.
- **Page navigation from sheet**: Clicking a nav link in the sheet (e.g., Ubicaciones) navigates via `<a href>` — the sheet closes naturally on page load.

## Testing Strategy

- **Unit**: No unit tests needed — this is pure layout/UI with no business logic
- **E2E**: Add Playwright spec for:
  - Bottom bar renders 4 items on mobile viewport
  - "Más" button opens the sheet
  - Sheet contains all expected items
  - Clicking overlay closes the sheet
  - Navigation from sheet works (click Ubicaciones → arrives at /locations)
  - Tablet viewport shows 7 items in bar
