# UX Fixes — Issues #13, #14, #15, #16

**Fecha:** 2026-04-01
**Estado:** Listo para implementar
**Branch sugerida:** `fix/ux-issues-13-16`

---

## Contexto

4 issues abiertos reportados por el usuario tras probar la app. Dos de ellos (#13 y #15) son el mismo bug visto desde distintos ángulos. Todos son problemas de UX, no de lógica de negocio.

**Prerequisito:** La branch `test/mvp-coverage` tiene el DRY refactor completo (355 tests, 17 commits). Mergear o rebasar antes de empezar.

---

## Issue #14 — LocationPicker: reordenar dropdown

**GitHub:** #14
**Complejidad:** Baja
**Archivo:** `src/components/islands/LocationPicker.tsx`

### Problema

El botón "+ Nueva ubicación" aparece al fondo del dropdown. El usuario quiere que esté arriba para acceso rápido, y que la lista esté ordenada alfabéticamente.

### Solución

Reordenar el JSX del dropdown:

1. `+ Nueva ubicación` (arriba, sin border-t)
2. Separador (`border-b`)
3. `Sin ubicación` (siempre visible, no condicionado a `locations.length > 0`)
4. Lista de ubicaciones ordenada alfabéticamente por nivel

Ordenamiento: en `flattenTree`, sort children por `name.localeCompare()` en cada nivel de la jerarquía.

### Tasks

- [ ] **Step 1:** Test — agregar test en `LocationPicker.test.tsx` que verifique que "Nueva ubicación" aparece antes que las ubicaciones existentes en el DOM
- [ ] **Step 2:** Implementar — swap del orden de render en el dropdown + sort en flattenTree
- [ ] **Step 3:** Verificar que `LocationPicker.test.tsx` y tests existentes pasan
- [ ] **Step 4:** Commit: `fix(islands): reorder LocationPicker dropdown — new location first (#14)`

---

## Issues #13 + #15 — Locations page: empty state sin botón + desktop vacío

**GitHub:** #13, #15
**Complejidad:** Media
**Archivos:** `src/pages/locations/index.astro`, `src/components/islands/LocationTree.tsx`

### Problema

Dos síntomas, misma causa raíz:

1. **#13 (mobile):** Cuando no hay ubicaciones, `EmptyState` no tiene botón de acción (`actionHref`/`actionLabel` no se pasan)
2. **#15 (desktop):** La página no tiene `slot="topbar"` ni `slot="desktop-main"` — el contenido solo se renderiza en mobile

Además, el botón "+ Nueva ubicación raíz" está al fondo del `LocationTree` (línea 126), lo cual es incómodo para listas largas.

### Solución

Restructurar `locations/index.astro` siguiendo el patrón de `inventory/index.astro`:

**Mobile:**
```
Header "Ubicaciones" + botón "Nueva ubicación" (arriba, en la barra)
LocationTree debajo (sin su propio botón de agregar al fondo)
Si vacío: EmptyState con botón de acción
```

**Desktop:**
```
Topbar (slot="topbar"): "Ubicaciones" + botón "Nueva ubicación"
Main (slot="desktop-main"): LocationTree o EmptyState
```

**LocationTree cambios:**
- Remover el botón "+ Nueva ubicación raíz" del fondo (líneas 126-151)
- La acción de crear se maneja desde la página, no desde el tree
- Opción A: Pasar un callback `onCreateRequest` como prop
- Opción B: Hacer que el botón de la página abra un form inline arriba del tree (más simple, KISS)

### Tasks

- [ ] **Step 1:** Agregar `slot="topbar"` con título + botón "Nueva ubicación" a `locations/index.astro`
- [ ] **Step 2:** Agregar `slot="desktop-main"` con LocationTree o EmptyState a `locations/index.astro`
- [ ] **Step 3:** Agregar `actionHref` y `actionLabel` al EmptyState (tanto mobile como desktop)
- [ ] **Step 4:** Decidir cómo manejar el "crear" desde la barra superior (form inline o redirect)
- [ ] **Step 5:** Remover botón "+ Nueva ubicación raíz" del fondo de `LocationTree.tsx`
- [ ] **Step 6:** Verificar E2E tests de locations siguen pasando
- [ ] **Step 7:** Commit: `fix(locations): add desktop view and empty state action (#13, #15)`

### Decisiones pendientes

- **¿El botón "Nueva ubicación" abre un form inline arriba del tree o navega a otra página?**
  - Recomendación: form inline (como hace LocationTree internamente ahora), pero controlado desde la página

---

## Issue #16 — Mobile: menú de usuario con logout y tema

**GitHub:** #16
**Complejidad:** Media
**Archivo:** `src/layouts/AppLayout.astro`

### Problema

En mobile no hay forma de cerrar sesión ni acceder a opciones de usuario. El toggle de tema ocupa un slot en el bottom nav sin dar acceso a logout.

### Solución

1. **Reemplazar el botón de tema** (último item del bottom nav) por un **avatar del usuario** (la inicial, como en desktop)
2. Al tocar el avatar: **popup/sheet** que aparece desde abajo con:
   - "Cerrar sesión" (llama a `supabase.auth.signOut()`)
   - "Cambio de tema" (toggle claro/oscuro, reusa `applyTheme()` existente)
3. El toggle de tema se **mueve** del bottom nav al menú del usuario (no en ambos lugares)

### Detalle técnico

- Los datos del usuario (`initial`, `name`, `email`) ya están disponibles en el frontmatter de AppLayout (líneas 14-16)
- La lógica de signOut ya existe en el JS del desktop (líneas 261-280)
- La función `applyTheme()` ya existe (líneas 232-247)
- Solo hay que crear IDs nuevos para mobile: `user-menu-btn-mobile`, `user-menu-mobile`, `logout-btn-mobile`

### Diseño del popup

```
┌─────────────────────────┐
│  [S] Sergio              │
│  sergio@email.com        │
│─────────────────────────│
│  🌙 Tema oscuro    [●○] │
│  🚪 Cerrar sesión       │
└─────────────────────────┘
```

- Aparece sobre el bottom nav con backdrop semi-transparente
- Se cierra tocando fuera o con el botón de cerrar

### Tasks

- [ ] **Step 1:** Reemplazar botón de tema en bottom nav por avatar con initial del usuario
- [ ] **Step 2:** Crear popup HTML (hidden por default) con opciones de usuario
- [ ] **Step 3:** Agregar JS para toggle del popup, logout, y theme switch
- [ ] **Step 4:** Remover el `theme-toggle-mobile` button y su JS asociado
- [ ] **Step 5:** Verificar que desktop sidebar no se vea afectado
- [ ] **Step 6:** Commit: `feat(layout): add mobile user menu with logout and theme toggle (#16)`

---

## Orden de implementación

| # | Issue | Complejidad | Dependencia |
|---|-------|-------------|-------------|
| 1 | **#14** — LocationPicker reorder | Baja | Ninguna |
| 2 | **#13+#15** — Locations page fix | Media | Ninguna |
| 3 | **#16** — Mobile user menu | Media | Ninguna |

Issues #14 y #16 son independientes entre sí y de #13+#15. Se pueden paralelizar con sub-agentes.

**TDD aplica:** cada fix empieza con un test que describe el comportamiento esperado.
