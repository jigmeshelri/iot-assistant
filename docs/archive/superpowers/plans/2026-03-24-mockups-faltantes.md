# Mockups Faltantes — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar los mockups faltantes del IoT Assistant para cubrir todas las funcionalidades de la especificación funcional, organizados en 3 fases de criticidad.

**Architecture:** Todo se implementa dentro del archivo existente `mockups/index.html`. Cada nuevo mockup es un `<div class="screen">` con vista móvil (`.phone`) + vista desktop (`.desktop-frame`), siguiendo exactamente los patrones CSS, estructura HTML y sistema de diseño ya establecidos (screens 0-5). Se agrega un botón de navegación por cada pantalla nueva en el nav `#nav-screens`.

**Tech Stack:** HTML estático, Tailwind CSS via CDN, SVG icons inline (mismo set que screens existentes).

**Referencia de diseño:** `mockups/index.html` (screens 0-5), `FUNCTIONAL_SPEC.md`, `TECHNICAL_SPEC.md`

---

## Estructura del archivo

**Archivo único a modificar:** `mockups/index.html`

Cambios necesarios:
1. **Nav buttons** (`#nav-screens`, línea ~178): agregar botones para cada nueva pantalla. **IMPORTANTE:** los labels de grupo y separadores NO deben tener la clase `screen-btn` — solo los `<button onclick="showScreen(N)">` la llevan. La función `showScreen()` usa `querySelectorAll('.screen-btn')` por índice posicional.
2. **Screen divs** (insertar después del `</div>` de cierre de `screen-5` en línea ~1443, antes de línea 1445 `</div><!-- fin flex contenedor -->`): agregar nuevos `<div class="screen">`
3. **JS showScreen()** (línea ~1552): no necesita cambios — ya funciona con cualquier cantidad de screens por índice posicional sobre `.screen` y `.screen-btn`

**Convención de IDs:** `screen-6` a `screen-17`, `btn-6` a `btn-17`

---

## Fase 1 — Criticidad CRÍTICA

> Pantallas que todo usuario recorrerá en su flujo core. Sin estos mockups no se puede presentar el producto de forma completa.

---

### Task 1: Detalle de Componente (`/inventory/[id]`)

**Spec ref:** 3.1 — "Vista de detalle: ficha completa del componente"

Esta es la pantalla más visitada después del inventario. El usuario llega desde la lista, desde QR, desde proyectos, desde el dashboard.

> **Nota de complejidad:** Este es el screen más denso del plan (imagen, identidad, conectividad, specs, ubicación, stock, datasheet, historial). El Step 2 (vista móvil) es especialmente largo — considerar implementarlo en dos pasadas: primero header + imagen + identidad, luego specs + ubicación + historial.

**Files:**
- Modify: `mockups/index.html` — agregar `screen-6` + botón nav `btn-6`

**Sidebar active:** Inventario

**Contenido del mockup:**

Móvil:
- Header con botón ← "Inventario", nombre del componente como título
- Imagen del componente (placeholder 16:9 con ícono de cámara)
- Sección de identidad: SKU (`MCU-001`), categoría badge, platform_family badge (`esp32`)
- Sección conectividad: tags `bg-green-50 text-green-700` (WiFi 6, BLE 5.0, Zigbee, Thread)
- Sección specs técnicas: grid 2-col de key-value (Voltaje: 3.3V, Interfaz: USB-C, CPU: RISC-V 160MHz, Flash: 4MB)
- Sección ubicación: card con `📦 Maletín Azul → Compartimento A` + botón "Cambiar"
- Sección stock: número grande + botones −/+ (StockAdjuster pattern)
- Enlace datasheet: ícono + "Ver datasheet" como link externo
- Sección historial de movimientos: 2-3 entradas tipo timeline (fecha + acción: "Añadido ×3", "Usado en Estación meteorológica ×1", "Transferido a Rack Taller")
- Botón inferior: "Editar componente" full-width

Desktop:
- Layout 2 columnas: izquierda (imagen grande + QR pequeño) | derecha (toda la info en secciones card)
- Topbar con breadcrumb: Inventario > ESP32-C6 XIAO
- Botones en topbar: "Editar" + "Eliminar"

- [ ] **Step 1:** Agregar botón `btn-6` "Detalle Componente" en el nav `#nav-screens` (después del botón "Comunidad", antes del separador de vista)
- [ ] **Step 2:** Crear el `<div class="screen" id="screen-6">` con la vista móvil completa (`.phone > .phone-inner`)
- [ ] **Step 3:** Crear la vista desktop dentro del mismo screen (`.desktop-frame`)
- [ ] **Step 4:** Agregar caption descriptivo debajo del screen
- [ ] **Step 5:** Verificar en navegador que ambas vistas se muestran correctamente al hacer click en el botón
- [ ] **Step 6:** Commit: `feat(mockups): add component detail screen (#6)`

---

### Task 2: Formulario Manual de Alta/Edición (`/inventory/new?mode=manual`)

**Spec ref:** 3.1 — "Alta de componente manual"

El mockup de Escanear IA (screen 2) muestra solo el flujo con cámara. Falta el formulario manual que es la ruta alternativa fundamental.

**Files:**
- Modify: `mockups/index.html` — agregar `screen-7` + botón nav `btn-7`

**Sidebar active:** Escanear IA (comparte flujo con screen-2)

**Contenido del mockup:**

Móvil:
- Header con ← "Inventario" + título "Nuevo componente"
- Tabs superiores: "📷 Escanear con IA" (inactivo) | "✏️ Manual" (activo, brand-600)
- Formulario vertical:
  - Input "Nombre" (text, placeholder "Ej: ESP32-C6 XIAO")
  - Select "Categoría" (Microcontrolador, Sensor, Actuador, Alimentación, Módulo, Pasivo)
  - Select "Familia de plataforma" (esp32, arduino, rpi, generic)
  - Multi-select "Conectividad" (checkboxes o tags toggleables: WiFi, BLE, LoRa, Zigbee, Thread, Ethernet)
  - Grid 2-col de specs: Voltaje (input), Interfaz (input), Encapsulado (input)
  - Input numérico "Cantidad" con −/+
  - Tree selector "Ubicación" (desplegable, muestra path: `Maletín Azul → Comp. A`)
  - Input URL "Datasheet" (opcional)
  - Zona de imagen: botón "Subir foto" con preview
- Botones: "Cancelar" (outline) + "Guardar" (brand-600)

Desktop:
- Layout centrado `max-w-2xl`
- Formulario en 2 columnas donde tiene sentido (nombre+categoría, plataforma+conectividad, specs en grid 3-col)
- Topbar breadcrumb: Inventario > Nuevo componente

- [ ] **Step 1:** Agregar botón `btn-7` "Alta Manual" en nav
- [ ] **Step 2:** Crear vista móvil del formulario
- [ ] **Step 3:** Crear vista desktop del formulario
- [ ] **Step 4:** Caption descriptivo
- [ ] **Step 5:** Verificar ambas vistas en navegador
- [ ] **Step 6:** Commit: `feat(mockups): add manual component form screen (#7)`

---

### Task 3: Ubicaciones — Lista y Árbol (`/locations`)

**Spec ref:** 3.3 — "Gestión de Ubicaciones Físicas"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-8` + botón nav `btn-8`

**Sidebar active:** Inventario

**Contenido del mockup:**

Móvil:
- Header: "Ubicaciones" + botón "+" para nueva ubicación
- Árbol visual jerárquico con indentación:
  ```
  🏠 Taller
    📦 Rack Taller
      └ Bandeja 1 (12 piezas)
      └ Bandeja 2 (8 piezas)
      └ Bandeja 3 (23 piezas)
    📦 Escritorio
      └ Cajón 1 (50 piezas)
      └ Cajón 2 (15 piezas)
  🧳 Maletín Azul
    └ Compartimento A (6 piezas)
    └ Compartimento B (3 piezas)
  ```
- Cada nodo: ícono + nombre + contador de piezas a la derecha
- Nodos padre: expandibles/colapsables (chevron)
- Tap en cualquier nodo → navega al detalle

Desktop:
- Layout 2 columnas: árbol a la izquierda (panel 300px) | contenido de ubicación seleccionada a la derecha
- Topbar: "Ubicaciones" + botón "Nueva ubicación"
- Panel derecho: vista previa de la ubicación seleccionada (nombre, sub-ubicaciones, lista de componentes)

- [ ] **Step 1:** Agregar botón `btn-8` "Ubicaciones" en nav
- [ ] **Step 2:** Crear vista móvil con árbol jerárquico
- [ ] **Step 3:** Crear vista desktop con panel split
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add locations tree screen (#8)`

---

### Task 4: Detalle de Ubicación (`/locations/[id]`)

**Spec ref:** 3.3 — "Vista de ubicación: lista todos los componentes almacenados"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-9` + botón nav `btn-9`

**Sidebar active:** Inventario

**Contenido del mockup:**

Móvil:
- Header: ← "Ubicaciones" + nombre "Maletín Azul → Compartimento A"
- Breadcrumb de jerarquía: `Taller > Maletín Azul > Compartimento A`
- Card de info: nombre, padre, cantidad total de piezas
- Botón "Generar QR" (outline, con ícono QR)
- Sub-ubicaciones (si las tiene): cards compactas navegables
- Lista de componentes en esta ubicación:
  - Mismo patrón de card que inventario (ícono categoría + nombre + qty)
  - Pero sin la línea de ubicación (ya estamos en ella)
- Botones: "Editar ubicación" + "Añadir sub-ubicación"

Desktop:
- Misma info pero en layout más amplio
- Grid de componentes en lugar de lista
- Panel lateral con QR preview + botón imprimir

- [ ] **Step 1:** Agregar botón `btn-9` "Detalle Ubicación" en nav
- [ ] **Step 2:** Crear vista móvil
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add location detail screen (#9)`

---

## Fase 2 — Criticidad ALTA

> Pantallas que representan flujos importantes y estados intermedios. Sin ellos, la demo tiene huecos visibles pero el flujo principal se entiende.

---

### Task 5: QR — Etiqueta y Vista de Escaneo (`/l/[qr_code]`)

**Spec ref:** 3.4 — "Códigos QR para Ubicaciones"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-10` + botón nav `btn-10`

**Sidebar active:** Inventario

**Contenido del mockup — 2 estados secuenciales dentro de un mismo `phone-inner`:**

> Ambos estados se renderizan secuencialmente dentro de un único `.phone-inner`, separados por un divider full-width con label. Este es el mismo patrón que usaría un doc de diseño para mostrar variantes de una pantalla.

Estado A — Etiqueta generada (dentro de detalle ubicación):
- Label: `<div class="bg-slate-100 text-center py-2 text-xs font-semibold text-slate-500 -mx-5 px-5">Estado A: Generar etiqueta QR</div>`
- Modal o card superpuesta: QR code grande (placeholder SVG cuadrado con patrón QR)
- Debajo del QR: nombre de ubicación + path jerárquico
- Botones: "Descargar PNG" + "Imprimir etiqueta"
- Preview de la etiqueta imprimible: rectángulo con borde punteado, QR + nombre

Estado B — Vista de escaneo (lo que ve alguien al escanear):
- Label: `<div class="bg-slate-100 text-center py-2 text-xs font-semibold text-slate-500 -mx-5 px-5">Estado B: Vista al escanear QR</div>`
- Pantalla sin bottom nav (acceso directo por URL)
- Header: logo IoT Assistant + "Contenido de ubicación"
- Info de ubicación: nombre + jerarquía
- Lista de componentes: nombre + qty + imagen miniatura
- Botón "Ajustar cantidad" por cada componente
- Footer: "Inicia sesión para gestionar" (si no autenticado)

- [ ] **Step 1:** Agregar botón `btn-10` "QR / Escaneo" en nav
- [ ] **Step 2:** Crear vista móvil con ambos estados secuenciales dentro de `phone-inner`, separados por divider con label
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add QR label and scan view screen (#10)`

---

### Task 6: Desambiguación IA

**Spec ref:** 3.2 línea 72 — "presenta al usuario las opciones para que elija manualmente"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-11` + botón nav `btn-11`

**Sidebar active:** Escanear IA

**Contenido del mockup:**

Este es un estado intermedio del flujo de escaneo (screen 2). Muestra qué pasa cuando la IA no puede elegir con confianza.

Móvil:
- Mismo fondo oscuro del viewfinder (cámara)
- Card blanca con:
  - Icono ⚠️ + "Múltiples coincidencias detectadas"
  - Texto: "El componente podría ser uno de los siguientes. Selecciona el correcto:"
  - Lista de 2-3 opciones como cards seleccionables:
    - **Opción 1:** ESP32-S3 XIAO — confianza 62% — badge `esp32` — WiFi, BLE
    - **Opción 2:** ESP32-C6 XIAO — confianza 58% — badge `esp32` — WiFi, BLE, Zigbee, Thread
    - **Opción 3:** ESP32-S2 XIAO — confianza 31% — badge `esp32` — WiFi
  - Cada opción: radio button a la izquierda, nombre bold, specs en gris, barra de confianza
  - Opción seleccionada: borde `border-brand-500` + fondo `bg-brand-50`
  - Botón "Confirmar selección" (brand-600)
  - Link "Ninguna es correcta → ingresar manualmente"

Desktop:
- Misma estructura pero dentro del panel derecho del layout 2-col de escaneo
- Cards de opciones más anchas con más info visible

- [ ] **Step 1:** Agregar botón `btn-11` "Desambiguación IA" en nav
- [ ] **Step 2:** Crear vista móvil
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add AI disambiguation screen (#11)`

---

### Task 7: Creación de Proyecto + Transiciones de Estado

**Spec ref:** 3.6.1 — "Tipo y Ciclo de Vida del Proyecto"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-12` + botón nav `btn-12`

**Sidebar active:** Proyectos

**Contenido del mockup — 2 estados secuenciales dentro de un mismo `phone-inner`:**

> Este screen es standalone e ilustra dos vistas que en la app real aparecen en contextos distintos: el formulario (al crear proyecto) y el panel de estado (dentro de la bitácora). Se muestran secuencialmente con divider, mismo patrón que Task 5.

Estado A — Formulario de nuevo proyecto:

Móvil:
- Header: ← "Proyectos" + "Nuevo proyecto"
- Origen: badge "Desde IA" o "Manual" (en este caso "Manual")
- Input "Título" (placeholder "Ej: Estación meteorológica solar")
- Textarea "Descripción" (placeholder breve)
- Selector de tipo (3 botones horizontales):
  - **DIY** (seleccionado, brand-600) — subtexto "Arduino, ESPHome, MicroPython"
  - **Prototipo** — subtexto "Funcional, no optimizado"
  - **Profesional** — subtexto "C/C++, Rust, producción"
- Nota informativa: card `bg-sky-50` con "Los proyectos Profesionales son privados por defecto"
- Selector de dificultad (3 botones): Principiante / Intermedio / Avanzado
- Sección BOM: "Componentes necesarios" + botón "Añadir desde inventario"
  - Lista de componentes seleccionados con cantidad
- Botones: "Cancelar" + "Crear proyecto" (brand-600)

Estado B — Panel de transición de estado (dentro de bitácora):
- Card compacta mostrando la máquina de estados:
  - Estado actual: "En curso" (brand badge)
  - Botones de transición: "Pausar" / "Completar" / "Abandonar"
  - Cada botón con ícono y color apropiado (amber/green/red)

- [ ] **Step 1:** Agregar botón `btn-12` "Crear Proyecto" en nav
- [ ] **Step 2:** Crear vista móvil con formulario + panel de estado
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add project creation and state transitions screen (#12)`

---

### Task 8: Consumo de Componentes (BOM interactiva)

**Spec ref:** 3.6.3 — "Control de Componentes Consumidos"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-13` + botón nav `btn-13`

**Sidebar active:** Proyectos

**Contenido del mockup:**

Extensión de la vista de proyecto (screen 4). Muestra la BOM con controles de consumo.

Móvil:
- Header: ← "Estación meteorológica" + "Componentes"
- Subtítulo: "3 de 5 componentes utilizados"
- Progress bar de consumo
- Lista de BOM items:
  - **ESP32-C6 XIAO** — ✅ Utilizado (1/1) — badge green — botón "↩ Deshacer"
  - **DHT22** — ✅ Utilizado (1/1) — badge green — botón "↩ Deshacer"
  - **BMP280** — ⬜ Pendiente (0/1) — badge amber "Falta en inventario" — botón "Marcar usado" deshabilitado
  - **Resistencias 4.7kΩ** — ✅ Utilizado (2/2) — badge green — botón "↩ Deshacer"
  - **OLED SSD1306** — ⬜ Pendiente (0/1) — badge outline — botón "Marcar como usado" (brand-600)
- Alerta inferior: card `bg-amber-50` "⚠ BMP280 no está en inventario. Necesitas adquirirlo."
- El botón "Marcar como usado" tiene un estado de confirmación: "¿Descontar 1 unidad del inventario?"

Desktop:
- Dentro del panel lateral derecho de la bitácora (reemplaza la vista estática de BOM)
- Checkboxes inline + botones de acción

- [ ] **Step 1:** Agregar botón `btn-13` "Consumo BOM" en nav
- [ ] **Step 2:** Crear vista móvil
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add BOM consumption screen (#13)`

---

### Task 9: Login / Autenticación

**Spec ref:** §4 — "Autenticación vía Supabase Auth (OAuth + magic link)"

Es el punto de entrada de la aplicación. Para una demo completa, el flujo empieza aquí.

> **Nota de complejidad:** El desktop tiene un split layout (branding 60% + form 40%) que es distinto a todos los demás screens (no usa `ds-sidebar`). Requiere estructura HTML propia.

**Files:**
- Modify: `mockups/index.html` — agregar `screen-14` + botón nav `btn-14`

**Sidebar active:** Ninguno (pantalla pre-auth, sin sidebar ni bottom nav)

**Contenido del mockup:**

Móvil:
- Sin bottom nav (pantalla pre-auth)
- Fondo `bg-slate-50` centrado verticalmente
- Logo IoT Assistant grande (ícono chip + nombre)
- Subtítulo: "Gestiona tu inventario de componentes electrónicos"
- Card blanca centrada:
  - Botón "Continuar con Google" (ícono Google + texto, borde gris, full-width)
  - Botón "Continuar con GitHub" (ícono GitHub + texto, borde gris, full-width)
  - Divider "o"
  - Input email + botón "Enviar magic link" (brand-600)
  - Texto legal micro: "Al continuar aceptas los términos de uso"
- Debajo de la card: "¿Primera vez? Se creará tu cuenta automáticamente"

Desktop:
- Layout 2 columnas: ilustración/branding a la izquierda (60%) | formulario a la derecha (40%)
- Panel izquierdo: fondo `bg-slate-900` con logo grande, tagline, y 3 feature bullets con íconos
- Panel derecho: misma card de login centrada
- Sin sidebar ni topbar (pantalla pre-auth)

- [ ] **Step 1:** Agregar botón `btn-14` "Login" en nav
- [ ] **Step 2:** Crear vista móvil
- [ ] **Step 3:** Crear vista desktop con split layout
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add login screen (#14)`

---

## Fase 3 — Criticidad MEDIA/BAJA

> Pantallas secundarias pero necesarias para una presentación completa del producto. Redondean la experiencia.

---

### Task 10: Publicación de Proyecto

**Spec ref:** 3.6.4 — "Publicación y Comunidad"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-15` + botón nav `btn-15`

**Sidebar active:** Proyectos

> **Nota de complejidad:** Este es un wizard de 3 pasos. El mockup muestra el paso 1 expandido con pasos 2-3 como previews colapsados (no se implementan 3 screens separados).

**Contenido del mockup:**

Flujo multi-paso de publicación:

Móvil:
- Header: "Publicar proyecto" + stepper (1. Metadatos → 2. Contenido → 3. Revisar)
- **Paso 1 visible:**
  - Input "Título público" (pre-rellenado con título del proyecto)
  - Textarea "Descripción pública"
  - Selector de dificultad
  - Input de etiquetas: tags tipo chip removibles ("WiFi", "sensor", "automatización") + input "añadir..."
- **Paso 2 (indicado con preview):**
  - Lista de entradas de bitácora con checkbox para incluir/excluir
  - Entradas seleccionadas: 3 de 4 (el "problema" excluido por el usuario)
  - Grid de fotos seleccionables para galería
- **Paso 3:**
  - Preview de cómo se verá en la comunidad (mini-card)
  - Aviso: "Tu inventario personal (cantidades, ubicaciones) no será visible"
  - Botón final: "Publicar" (brand-600)

Desktop:
- Steps horizontales con contenido visible en layout más amplio
- Preview del resultado final al costado derecho

- [ ] **Step 1:** Agregar botón `btn-15` "Publicar" en nav
- [ ] **Step 2:** Crear vista móvil (3 pasos, paso 1 expandido)
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add project publication flow screen (#15)`

---

### Task 11: Generación y Análisis de Código IA

**Spec ref:** 3.7.1 — "Generación de código desde el proyecto" + 3.7.2 — "Análisis y mejora de código existente"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-16` + botón nav `btn-16`

**Sidebar active:** Proyectos

**Contenido del mockup — 2 estados secuenciales dentro de `phone-inner`:**

**Estado A — Generación de código (spec 3.7.1):**

Se llega desde el botón "Generar nuevo código" en la bitácora (screen 4).

Móvil:
- Label divider: "Estado A: Generar código"
- Header: ← "Bitácora" + "Generar código"
- Card de contexto: título del proyecto + BOM resumida (3 componentes clave)
- Selector "Entorno de destino":
  - Buttons: "Arduino IDE" (seleccionado, brand-600) / "ESPHome" / "MicroPython"
  - Subtexto: "Sugerido para proyecto DIY con esp32"
- Selector "Tipo de código":
  - "Esqueleto (estructura + comentarios)" / "Código completo funcional" (seleccionado)
- Botón "Generar con IA →" (brand-600, full-width)
- Resultado: bloque `bg-slate-900` con código generado
- Botones: "Descargar .ino" + "Añadir a bitácora"

**Estado B — Análisis de código existente (spec 3.7.2):**

Se llega desde el botón "Analizar y mejorar" en la bitácora (screen 4).

Móvil:
- Label divider: "Estado B: Analizar código"
- Header: ← "Bitácora" + "Análisis de código"
- Badge: "Arduino IDE · esp32"
- Sección "Código original": bloque `bg-slate-900` con código del usuario (colapsable)
- Sección "Análisis IA":
  - Card con ícono IA + "3 mejoras sugeridas"
  - Lista de mejoras, cada una:
    - Título bold ("Optimizar lectura del sensor")
    - Texto explicativo en gris
    - Badge de tipo: "rendimiento" (green), "bug potencial" (red), "estilo" (blue)
- Sección "Código mejorado": bloque `bg-slate-900` con diff highlights (líneas verdes = añadido, líneas rojas tachadas = removido)
- Botones: "Descargar código mejorado" + "Reemplazar en bitácora"

Desktop:
- Layout 2 columnas para ambos estados: controles a la izquierda | resultado/código a la derecha
- Estado B: side-by-side diff view (original vs mejorado)

- [ ] **Step 1:** Agregar botón `btn-16` "Código IA" en nav
- [ ] **Step 2:** Crear vista móvil con Estado A (generación)
- [ ] **Step 3:** Crear vista móvil con Estado B (análisis) separado por divider
- [ ] **Step 4:** Crear vista desktop
- [ ] **Step 5:** Caption
- [ ] **Step 6:** Verificar
- [ ] **Step 7:** Commit: `feat(mockups): add code generation and analysis screen (#16)`

---

### Task 12: Hilo de Comentarios (Comunidad)

**Spec ref:** 3.6.4 — "Comentarios: hilo de comentarios por proyecto"

**Files:**
- Modify: `mockups/index.html` — agregar `screen-17` + botón nav `btn-17`

**Sidebar active:** Comunidad

**Contenido del mockup:**

Vista expandida de un proyecto de comunidad (`/community/[id]`) con hilo de comentarios.

Móvil:
- Header: ← "Comunidad" + título del proyecto
- Card del proyecto (compacta): avatar autor + título + descripción + stats (forks, árbol)
- Divider
- Sección "Comentarios (8)":
  - Input de comentario: avatar + textarea + botón "Enviar"
  - Lista de comentarios, cada uno:
    - Avatar circular + nombre + "hace 2h"
    - Texto del comentario
    - Botón "Responder" (text-only)
  - Respuesta indentada (margin-left) con línea vertical connecting
- Ejemplo: 3-4 comentarios con 1 respuesta anidada

Desktop:
- Layout 2 columnas: proyecto completo (BOM, galería, bitácora pública) a la izquierda | hilo de comentarios a la derecha (panel 380px)

- [ ] **Step 1:** Agregar botón `btn-17` "Comentarios" en nav
- [ ] **Step 2:** Crear vista móvil
- [ ] **Step 3:** Crear vista desktop
- [ ] **Step 4:** Caption
- [ ] **Step 5:** Verificar
- [ ] **Step 6:** Commit: `feat(mockups): add comment thread screen (#17)`

---

## Task 13: Reorganización del Nav

Después de agregar todos los screens, el nav tendrá 18 botones (6 existentes + 12 nuevos). Necesita reorganización en 2 niveles para evitar un nav inmanejable.

**Files:**
- Modify: `mockups/index.html` — sección `#nav-screens` + agregar JS para tabs de grupo

**Estrategia: Nav en 2 filas (grupo + screens)**

Fila 1 — Tabs de grupo (siempre visible):
```html
<div class="flex gap-2 justify-center mb-2">
  <button class="group-tab ..." onclick="showGroup('core')">Core</button>
  <button class="group-tab ..." onclick="showGroup('inventario')">Inventario</button>
  <button class="group-tab ..." onclick="showGroup('flujos')">Flujos</button>
  <button class="group-tab ..." onclick="showGroup('otros')">Otros</button>
  <!-- separador + toggle Móvil/Escritorio (ya existe) -->
</div>
```

Fila 2 — Screens del grupo seleccionado (cambia según tab):
```html
<div id="group-core" class="flex gap-2 justify-center">
  <!-- botones screen-btn 0-5 -->
</div>
<div id="group-inventario" class="hidden flex gap-2 justify-center">
  <!-- botones screen-btn 6-9 -->
</div>
<!-- etc -->
```

**Grupos:**
- **Core** (screens 0-5): Dashboard, Inventario, Escanear IA, Explorar Proyectos, Bitácora, Comunidad
- **Inventario** (screens 6-9): Detalle Componente, Alta Manual, Ubicaciones, Detalle Ubicación
- **Flujos** (screens 10-13): QR/Escaneo, Desambiguación IA, Crear Proyecto, Consumo BOM
- **Otros** (screens 14-17): Login, Publicar, Código IA, Comentarios

**CRÍTICO:** Los labels de grupo (`group-tab`) y contenedores de grupo NO deben tener la clase `screen-btn`. Solo los `<button onclick="showScreen(N)">` dentro de cada grupo llevan `screen-btn`. La función `showScreen()` usa `querySelectorAll('.screen-btn')` por índice posicional — si elementos extra tienen esa clase, el mapeo se rompe.

**JS adicional:**
```javascript
function showGroup(name) {
  document.querySelectorAll('[id^="group-"]').forEach(g => g.classList.add('hidden'))
  document.getElementById('group-' + name).classList.remove('hidden')
  // Actualizar estilo de tabs de grupo
  document.querySelectorAll('.group-tab').forEach(t => {
    t.classList.remove('bg-slate-800', 'text-white')
    t.classList.add('bg-slate-100', 'text-slate-500')
  })
  event.target.classList.add('bg-slate-800', 'text-white')
  event.target.classList.remove('bg-slate-100', 'text-slate-500')
}
```

- [ ] **Step 1:** Envolver los botones existentes (0-5) en `<div id="group-core">`
- [ ] **Step 2:** Crear contenedores `group-inventario`, `group-flujos`, `group-otros` con los botones correspondientes
- [ ] **Step 3:** Agregar fila de tabs de grupo encima
- [ ] **Step 4:** Agregar función `showGroup()` al JS
- [ ] **Step 5:** Verificar que `showScreen()` sigue funcionando (solo `.screen-btn` en los botones)
- [ ] **Step 6:** Commit: `feat(mockups): reorganize nav with grouped tabs`

---

## Resumen de Screens

| Screen | ID | Nombre | Task | Fase | Spec | Sidebar Active |
|---|---|---|---|---|---|---|
| 0 | `screen-0` | Dashboard | — | Existente | — | Dashboard |
| 1 | `screen-1` | Inventario | — | Existente | — | Inventario |
| 2 | `screen-2` | Escanear IA | — | Existente | — | Escanear IA |
| 3 | `screen-3` | Explorar Proyectos | — | Existente | — | Proyectos |
| 4 | `screen-4` | Bitácora | — | Existente | — | Proyectos |
| 5 | `screen-5` | Comunidad | — | Existente | — | Comunidad |
| 6 | `screen-6` | Detalle Componente | 1 | **Fase 1** | 3.1 | Inventario |
| 7 | `screen-7` | Alta Manual | 2 | **Fase 1** | 3.1 | Inventario |
| 8 | `screen-8` | Ubicaciones | 3 | **Fase 1** | 3.3 | Inventario |
| 9 | `screen-9` | Detalle Ubicación | 4 | **Fase 1** | 3.3 | Inventario |
| 10 | `screen-10` | QR / Escaneo | 5 | **Fase 2** | 3.4 | Inventario |
| 11 | `screen-11` | Desambiguación IA | 6 | **Fase 2** | 3.2 | Escanear IA |
| 12 | `screen-12` | Crear Proyecto | 7 | **Fase 2** | 3.6.1 | Proyectos |
| 13 | `screen-13` | Consumo BOM | 8 | **Fase 2** | 3.6.3 | Proyectos |
| 14 | `screen-14` | Login | 9 | **Fase 2** | §4 | _(ninguno)_ |
| 15 | `screen-15` | Publicar Proyecto | 10 | **Fase 3** | 3.6.4 | Proyectos |
| 16 | `screen-16` | Código IA | 11 | **Fase 3** | 3.7.1 + 3.7.2 | Proyectos |
| 17 | `screen-17` | Comentarios | 12 | **Fase 3** | 3.6.4 | Comunidad |

> **Nota sobre búsqueda y filtros (spec 3.1):** El panel expandido de filtros multi-faceta (por voltaje, protocolo, ubicación, conectividad) está parcialmente cubierto por los chips de categoría en screen-1 (Inventario). Un mockup dedicado del panel de filtros expandido sería ideal pero queda fuera de alcance de este plan — la implementación actual con chips cubre el caso más común.

---

## Notas de Implementación

### Patrones a reutilizar (copiar de screens existentes)

| Patrón | Screen fuente | Uso |
|---|---|---|
| Status bar (móvil) | Screen 0, líneas 208-216 | Todas las vistas móvil |
| Bottom nav | Screen 0, líneas 326-343 | Todas las vistas móvil (excepto Login) |
| Sidebar desktop | Screen 0, líneas 351-361 | Todas las vistas desktop |
| Desktop chrome (browser frame) | Screen 0, línea 349 | Todas las vistas desktop |
| Card component | `.card` class definida en CSS | Contenedores de info |
| Tag/badge | `.tag` class definida en CSS | Estados, categorías |
| Category colors | Brand=MCU, Amber=Sensor, Violet=Actuador/Módulo, Green=Alimentación, Slate=Pasivo (definido en `pages/index.astro:35-40` y `pages/inventory/index.astro:12-17`, replicado en mockup screens 1-2) | Iconos y fondos |
| Timeline pattern | Screen 4, líneas 1088-1164 | Historial en detalle componente |

### Reglas de consistencia

1. **Siempre** incluir vista móvil Y desktop para cada screen
2. **Nunca** inventar colores nuevos — usar solo los de la paleta existente
3. **Siempre** usar el patrón `status-bar` + `bottom-nav` en móvil
4. **Siempre** usar `ds-sidebar` + `ds-topbar` + `ds-main` en desktop
5. Los border-radius son `rounded-2xl` (16px) para cards y `rounded-xl` (12px) para inputs/botones
6. Los íconos son SVG inline, stroke-width 1.5 para decorativos y 2 para navegación
7. El caption debajo de cada screen usa `<p class="text-xs text-slate-400 text-center max-w-xs">`
