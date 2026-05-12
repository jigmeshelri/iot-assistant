# Especificación Funcional — IoT Assistant

**Versión**: 0.5
**Fecha**: 2026-05-11
**Estado**: Borrador en construcción — rewrite desde la visión cross-device
**Predecesor**: v0.4 (2026-03-25). El contenido anterior queda accesible vía `git show` sobre la historia previa del archivo.

---

## 0. Cambio de paradigma respecto a v0.4

La v0.4 describía el producto como un **catálogo de componentes + bitácora de proyectos con CRUD**: módulos independientes (inventario, ubicaciones, proyectos, comunidad) donde el usuario es el que **registra** todo lo que pasa.

La v0.5 redefine el producto como un **partner cross-device del workflow físico**: una sola sesión de trabajo manifestada en dos pantallas complementarias (desktop como cerebro, mobile como sentidos y manos), donde el sistema **observa y conduce** el proyecto y los datos (inventario, ubicaciones, BOM) son **insumos consumidos por el workflow**, no destinos en sí mismos.

El cambio no es agregar features. Es **mover el centro de gravedad** del producto. La Sesión de Workflow (§4.1) pasa a ser el primer módulo y todo lo demás se ordena alrededor.

---

## 0.1 Decisiones de Diseño Tomadas

Listado canónico de las decisiones de arquitectura y producto cerradas durante el proceso de definición del v0.5. Estas decisiones gobiernan el resto del documento. Para cambiarlas hay que revisar esta sección — no se discuten ad-hoc en módulos individuales.

| #   | Decisión                                | Resumen                                                                                                                                                                                                                                                                                          | Sección donde se detalla    |
|-----|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------|
| D1  | Arquitectura de sincronización          | Optimistic UI + event sourcing con Supabase como árbitro. Los clientes aplican cambios localmente de forma instantánea; una cola local (IndexedDB) sincroniza con el servidor en background; el log de eventos en Supabase es source of truth eventual.                                          | §4.1, §5.3                  |
| D2  | Estrategia de UUIDs                     | **UUID7** para tablas event-sourced nuevas (`workflow_events`, `workflow_session`, `device_connections`). **UUID4** para `remote_session` y para todas las tablas existentes (`components`, `locations`, `projects`, etc.) — no se migra lo que ya funciona.                                     | §6 Modelo de datos          |
| D3  | Inicio de sesión de workflow            | Mixto: si hay una `remote_session` activa cuando el usuario abre un proyecto, la sesión se reactiva automáticamente. Si no, hay un botón explícito "Empezar sesión / Activar Remote Control".                                                                                                    | §4.1.3                      |
| D4  | Sesiones simultáneas en v1              | **Una sola sesión activa por usuario** en v1. Simpleza primero; flexibilidad si el patrón lo justifica más adelante.                                                                                                                                                                             | §4.1                        |
| D5  | Bitácora como proyección del log        | NO existe "bitácora manual vs bitácora automática". El log de `workflow_events` es la única fuente. Las entradas visibles son una proyección filtrada de ese log: eventos del sistema (`item_found`, `mode_changed`, etc.) + eventos de tipo `journal_entry_added` que escribe el usuario.       | §4.8.3                      |
| D6  | Agente IA contextual                    | El chat genérico actual (`api/` Railway) se refactorea. El agente pasa a ser **invocable desde cada vista** con **contexto rico pre-cargado**: proyecto activo, BOM completo con specs técnicas, plataforma y conectividad, inventario actual, sesión de workflow en curso. Reemplaza el chat actual. | §4.10                       |
| D7  | Métrica cross-device                    | KPI nuevo: **"% de sesiones de fetching iniciadas en desktop que se continúan en mobile dentro de 1 hora"**. Mide si la promesa cross-device se cumple en uso real.                                                                                                                              | §1.5                        |
| D8  | Comunidad diferida                      | El módulo de Comunidad (forks, comentarios, feed público) que figuraba en v0.4 §3.6.4 se difiere completo a post-MVP. Se reevalúa cuando haya tracción real de uso de los módulos core. No tiene AC en v0.5.                                                                                       | §8                          |
| D9  | Generación de código degradada          | La generación de código desde el contexto del proyecto pasa de Should Have (v0.4) a **Could Have** (v0.5). Disponible solo desde el agente IA contextual, no como flujo independiente.                                                                                                           | §4.10.2                     |
| D10 | Análisis de código standalone diferido  | Mantiene el estado Won't Have v1 que ya tenía en v0.4. Sin cambios.                                                                                                                                                                                                                              | §8                          |
| D11 | Estrategia de rewrite                   | v0.5 reemplaza v0.4 entero. v0.4 queda accesible vía git history. No hay coexistencia de specs.                                                                                                                                                                                                  | (este header)               |
| D12 | Idioma del documento                    | Español rioplatense — audiencia primaria humana (SD + CJ). Términos técnicos y nombres de archivos/funciones conservan su forma natural (inglés cuando corresponde).                                                                                                                              | (este header)               |
| D13 | Patrones de interacción consistentes entre módulos y entre dispositivos | Los listados, formularios y navegación siguen los mismos patrones **(a) entre módulos y (b) entre dispositivos**. Una decisión que se toma una vez (por ej. "toda la fila del listado es clickeable") se aplica idéntica en inventario, ubicaciones, proyectos y BOM, y se respeta tanto en mobile como en desktop. Sin divergencias responsive: si en mobile la fila es clickeable, en desktop también — no se reduce a un botón pequeño.                  | §2.1 + módulos              |
| D14 | Cada vista se diseña por dispositivo, no se porta | Mobile NO es desktop reducido. Cada vista se piensa desde cero para el dispositivo en uso (touch targets, jerarquía visual, densidad de información, layout stacked vs grid). Los layouts soportan contenido variable (specs largas, descripciones extensas, nombres compuestos) sin desbordamiento del viewport ni truncamiento silencioso de datos de lectura. Si hay que ocultar contenido por espacio, es con interacción explícita (tap/click-to-expand), no con ellipsis muda. | §2 + §5.4                   |
| D15 | NFC como mecanismo primario de identificación física de ubicaciones | Las etiquetas físicas de ubicaciones en v1 son **tags NFC**, no códigos QR. Razones: hardware muy barato (~USD 0.10–0.30 por tag), lectura instantánea sin necesidad de alinear cámara, mejor UX en mobile, y evita el problema histórico de v0.4 donde generar el QR no equivalía a poder imprimirlo bien. El QR se difiere a v2 con pipeline completo de impresión. | §4.7, §8                    |
| D16 | Features se entregan end-to-end al resultado del usuario | Una feature no es "el output técnico correcto" — es "el usuario logra lo que vino a hacer". Si generamos un QR para etiquetar una ubicación, acompañamos hasta tenerlo impreso correctamente (templates de hojas, dimensiones recomendadas, múltiples por hoja). Si una feature no llega al resultado físico/funcional, NO se entrega. Aplicable a impresión, exportación, descargas y cualquier flujo que cruce el borde digital→físico. | §2 + módulos                |

---

## 0.2 Open Questions (Decisiones Pendientes)

Issues abiertos de definición. **No bloquean el avance general del documento**, pero deben resolverse antes de implementar las secciones marcadas. Se trackean acá hasta cerrarse — al cerrarse, pasan a §0.1 con su número de decisión.

| #   | Pregunta abierta                                                                                                | Sección afectada     | ¿Bloquea?                                                | Quién decide        |
|-----|-----------------------------------------------------------------------------------------------------------------|----------------------|----------------------------------------------------------|---------------------|
| Q1  | ¿La instancia Supabase del proyecto está en Postgres 17+ (para `uuidv7()` nativo) o necesitamos extension?      | §6 Modelo de datos   | Implementación del event sourcing                        | SD (verificar)      |
| Q2  | TTL del `remote_session`: ¿cuál es el default y es configurable por usuario en v1?                              | §4.2.1               | AC del remote control                                    | SD + CJ             |
| Q3  | ¿Renombrar el producto? "IoT Assistant" describe la categoría, no la promesa de partner del workflow.           | §1                   | No bloquea — cosmético/branding                          | SD + CJ             |
| Q4  | Política de retención y capacidad máxima de la cola IndexedDB local (¿cuántos eventos sin sync se aceptan?)     | §5.7                 | AC del modo offline                                      | SD (técnica)        |
| Q5  | UX de conflictos en bitácora compartida: ¿cómo se muestra el toast "tu compañero editó esto al mismo tiempo"?   | §4.8.3               | AC de bitácora                                           | SD (UX)             |
| Q6  | Reactivación de sesión cerrada: si una sesión está en `closing` y se reabre el proyecto, ¿se retoma o nueva?    | §4.1.3               | AC del ciclo de vida del workflow                        | SD + CJ             |
| Q7  | ¿Pairing in-situ (QR efímero) entra en v1, o se difiere a post-MVP y queda solo el remote control mode?         | §4.2.2 o §8          | Define si §4.2.2 existe en v1                            | SD + CJ             |
| Q8  | ¿La generación de código (Could Have) se entrega en v1 dentro del agente, o se difiere?                          | §4.10.2 o §8         | AC del agente                                            | SD + CJ             |
| Q9  | Escena B de la visión (agente sugiere alternativas del inventario cuando falta una pieza): ¿v1 o difiere?       | §4.10                | AC del agente                                            | SD + CJ             |
| Q10 | Política de reproyección de la bitácora si en el futuro se agregan tipos de evento nuevos: ¿retroactiva o no?   | §4.8.3               | No bloquea v1 — política de evolución a largo plazo      | SD (técnica)        |
| Q11 | Audit trail de conexiones cross-device: ¿es UI visible para el usuario o queda solo en backend?                 | §4.2.1               | AC del remote control mode                               | SD (UX)             |
| Q12 | Hardware NFC para v1: ¿qué writer USB compran SD y CJ y qué tags (NTAG213/215/216, dimensiones, autoadhesivos)? | §4.7                 | Pilot del módulo                                         | SD + CJ             |
| Q13 | **Web NFC API no es soportada en iOS Safari** (solo en Chrome para Android). ¿v1 entrega NFC solo en Android (CJ)? ¿Fallback en iOS via Camera + deep link? ¿Se difiere NFC hasta soporte iOS? Blocker técnico real si SD usa iPhone. | §4.7, §5.2, §5.3     | AC del módulo en iOS                                     | SD + CJ (técnica)   |
| Q14 | Estándar NDEF y formato del payload del tag: ¿URL `https://app/loc/<uuid>`? ¿Deep link `iota://loc/<uuid>`? ¿UUID puro? | §4.7                 | AC del módulo                                            | SD (técnica)        |

---

## 1. Visión del Producto

### 1.1 Una frase y emoción objetivo

> **El producto te acompaña a hacer el proyecto. No te pide que lo registres.**

La emoción objetivo es **calma + competencia + complicidad**. Como tener un colega senior al lado que ya leyó todo, sabe dónde está cada pieza y conduce con confianza tranquila. No interroga. No llena de forms. No hace pensar en él.

**Anti-emociones** (lo que el producto NO debe transmitir):

- Burocrático ("llená este campo, ahora este otro")
- Pasivo ("anotá vos que yo solo guardo")
- Ansioso ("¡cargá tu inventario completo antes de empezar!")
- Genérico ("plantilla de admin con CRUD que vimos 1.000 veces")

**Emociones objetivo**:

- **Conducción** ("acá estás, esto es lo que sigue")
- **Anticipación** ("ya te tengo preparado lo que vas a necesitar")
- **Continuidad** ("lo que pasaste hace 30 segundos en el teléfono ya está acá en el escritorio")
- **Confianza tranquila** ("sé qué hago, vos enfocate en el proyecto")

### 1.2 Tres escenas wuaw

Tres escenas que capturan la promesa del producto. Si la experiencia se siente como en estas escenas, ganamos. Cada escena origina ACs detallados en los módulos correspondientes.

**Escena A — Arranque de un proyecto** (origina ACs en §4.1, §4.2.1, §4.3)

El usuario abre un proyecto en el desktop. El sistema le muestra el BOM y le dice: *"Tenés 4 piezas a buscar. Están en 3 ubicaciones distintas. ¿Las traemos?"* El usuario confirma. El desktop muestra un indicador *"remote control activo — escaneá con el teléfono"*. El usuario toma el teléfono, abre la app y encuentra automáticamente la sesión: *"Conectar a sesión remota: proyecto X"*. Tap. El teléfono se transforma en una vista de búsqueda guiada (pieza 1 de 4, ubicación caja-3-estante-B). El usuario camina, escanea el QR de la pieza, suena un clic suave en ambas pantallas al mismo tiempo. La pieza se tacha en ambas pantallas en tiempo real. *"3 piezas restantes, próxima en cajón-A-2."* Cuando vuelve al escritorio con las 4 piezas, el desktop ya cambió de modo: *"Listo. Vamos al schematic."*

**Escena B — Falta una pieza** (origina ACs en §4.10, sujeta a Q9)

A mitad del proyecto, el usuario descubre que necesita un capacitor que no tenía planeado. En vez de abrir un buscador, le dice al agente: *"necesito un capacitor cerámico 100nF."* El sistema responde en el desktop: *"Tenés 8 unidades en cajón-B-1. ¿Querés que te guíe?"* Si el usuario confirma, el teléfono entra automáticamente en modo búsqueda dirigida — sin cambiar de app, ni de modo, ni de contexto.

**Escena C — Cierre de sesión** (origina ACs en §4.8.3, §4.8.4)

El usuario termina la sesión. No hay un botón "guardar todo". El sistema ya registró: qué piezas usó, cuáles devolvió a inventario, cuáles quedaron en el proyecto. Le muestra un resumen: *"Hoy avanzaste el proyecto X. Usaste 3 piezas, devolviste 1, te quedaste con 1 prestada para mañana. ¿Querés agregar una nota?"* La bitácora ya no es un cuaderno tonto — es un **resumen narrativo de lo que pasó**, generado por el sistema a partir de eventos, que el usuario edita o aprueba en 10 segundos.

### 1.3 Lo que el producto deja de ser

| Antes (v0.4 — cuaderno tonto) | Después (v0.5 — partner del workflow) |
|---|---|
| Sistema de registro pasivo | Conductor activo del proyecto |
| Forms y CRUD como interfaz primaria | Conversación + acción guiada |
| Mobile y desktop son apps separadas que comparten datos | Mobile y desktop son **una sesión en dos pantallas** |
| Bitácora = lo que escribís | Bitácora = lo que el sistema observó + tus comentarios |
| BOM = lista de materiales | BOM = workflow ejecutable que dispara la sesión de fetching |

### 1.4 Usuarios objetivo

| Perfil | Descripción |
|---|---|
| **Maker / Hobbyist** | Acumula componentes de distintas fuentes y necesita saber qué tiene y dónde está. |
| **Estudiante de electrónica** | Gestiona un kit de laboratorio y quiere explorar proyectos con sus piezas actuales. |
| **Profesional / Freelancer** | Requiere trazabilidad de stock para cotizar proyectos y evitar compras duplicadas. |

En la fase actual del producto, los usuarios concretos validando v0.5 son **SD y CJ**. La sección Comunidad (forks, feed público, comentarios) se difiere hasta tener tracción real de uso de los módulos core con estos dos usuarios (ver §8).

### 1.5 Métricas de éxito (KPIs)

**Métricas de producto (MVP)**:

| Métrica | Objetivo v1 | Cómo se mide |
|---|---|---|
| Usuarios activos semanales (WAU) | 50+ | Supabase Auth sessions activas en 7 días |
| Retención semanal | > 40 % | WAU semana N / WAU semana N-1 |
| Componentes registrados por usuario | > 15 promedio | `COUNT(user_stock)` / `COUNT(DISTINCT user_id)` |
| % componentes con ubicación asignada | > 60 % | Señal de que el módulo de ubicaciones aporta valor real |
| Tasa de adopción de scan IA | > 30 % de altas | Altas via scan / total altas — valida si la IA reduce fricción |
| Proyectos creados por usuario activo | > 0.5 / mes | Señal de engagement más allá del inventario |
| **Sesiones cross-device exitosas (D7)** | > 50 % | % de sesiones de `fetching` iniciadas en desktop que se continúan en mobile dentro de 1 hora y cierran en estado `building` o `closing` |

**Métricas de calidad**:

| Métrica | Objetivo | Notas |
|---|---|---|
| Latencia evento mobile→desktop (p95) | < 500 ms | Desde tap en mobile hasta render del cambio en desktop |
| Errores de RLS | 0 | Un usuario nunca debe ver datos de otro — monitoreado en logs |
| Reintentos exitosos de cola offline | > 99 % | Eventos que terminan sincronizando tras reintento exponencial |
| Precisión del scan IA | > 70 % sin corrección | % de scans donde el usuario acepta la sugerencia sin editar |
| Latencia scan IA (p95) | < 10 s | Desde envío de imagen hasta respuesta completa |

---

## 2. Identidad del Producto

Sección nueva respecto a v0.4. Define cómo se comporta y se siente el producto cuando aparece frente al usuario. **D13** (consistencia entre módulos y dispositivos) y **D14** (cada vista se diseña por dispositivo, no se porta) son los principios transversales de esta sección — se aplican en cada módulo de §4 sin excepción.

### 2.1 Voz y microcopy

**Cómo habla el producto**:

- **Segunda persona, directo, breve.** *"Listo, vamos al schematic"* — no *"Su workflow ha sido actualizado exitosamente"*.
- **Asume contexto.** *"Próxima pieza"* — no *"La siguiente pieza del Bill Of Materials que usted está procesando"*.
- **Confirma con calma.** *"Listo."* / *"Anotado."* / *"Ya está."* — no *"¡Operación completada con éxito!"*.

**Cómo NO habla**:

- ❌ Corporativo ("Bienvenido a su panel de control")
- ❌ Animadito falso ("¡Genial! 🎉 Has completado tu primer item")
- ❌ Burocrático ("El sistema requiere que...")
- ❌ Ansioso ("¡No olvides actualizar tu inventario!")

Estos principios se aplican a **todos los strings del producto** — labels de botones, mensajes de toast, empty states, tooltips, errores. Los strings se revisan contra este check en review de PR.

### 2.2 Personalidad en 5 ejes

| Eje | Posición | Implicancia concreta |
|---|---|---|
| Serio ↔ Lúdico | **Más serio que lúdico, pero con calidez** | Sin emojis decorativos en UI; humor sutil permitido en empty states |
| Pasivo ↔ Proactivo | **Proactivo** | El sistema sugiere el próximo paso, no espera que el usuario lo descubra |
| Verbose ↔ Conciso | **Conciso al extremo** | Máximo ~12 palabras por mensaje principal; los detalles son opcionales (tap/click-to-expand) |
| Genérico ↔ Específico | **Específico** | Sabe de inventario y proyectos físicos — no es un admin genérico de CRUD |
| Frío ↔ Cálido | **Cálido sin sentimentalismo** | Como un buen mentor — presente, no efusivo |

### 2.3 Referencias visuales y de UX

**A robar** (productos cuya experiencia capturamos en parte):

- **Linear** — densidad informativa, keyboard-first, cero adornos, transiciones magistrales.
- **Raycast** — comando rápido, contexto persistente, sensación de "te lee la mente".
- **Arc** — invierte la jerarquía clásica de browser, trae lo importante adelante.
- **Things 3** — calma absoluta, tipografía respira, decisiones de diseño coherentes.
- **Granola.ai** — asiste sin estorbar; presente sin ser intrusivo.
- **Apple Continuity Camera** — el patrón cross-device perfecto que inspira la Escena A.

**A NO imitar**:

- ❌ **Stripe Dashboard moderno** — excelente pero NO conduce; es un panel de control que espera input. Nosotros conducimos.
- ❌ **Notion** — todo es maleable, no hay opinión. Nosotros tenemos una opinión clara sobre cómo se hace un proyecto físico.
- ❌ **ChatGPT genérico** — chat puro sin contexto físico ni acción del workflow.

### 2.4 Microcopy antes/después

Ejemplos canónicos que ilustran el tono. NO son una lista exhaustiva — son la referencia para que el resto del producto se escriba con el mismo criterio.

| Antes (v0.4 / placeholder estándar) | Después (v0.5) |
|---|---|
| *"¿Está seguro que desea eliminar este item?"* | *"Borrar pieza. ¿Sí?"* |
| *"Inventario actualizado correctamente."* | *"Listo."* |
| *"No hay items en este proyecto. Agregue uno para comenzar."* | *"Proyecto vacío. ¿Arrancamos por el BOM?"* |
| *"Su sesión ha expirado por inactividad. Por favor inicie sesión nuevamente."* | *"Te desconecté por inactividad. ¿Volvemos?"* |
| *"Error: no se pudo conectar al servidor."* | *"Sin conexión. Lo guardé local, sincronizo cuando vuelvas."* |

---

## 3. Priorización (MoSCoW)

> _Por escribir. Refleja las decisiones D1–D14. Tabla revisada respecto a v0.4: workflow session, pairing remote control, realtime sync e identidad pasan a Must Have; comunidad sale; code generation degrada a Could Have._

---

## 4. Módulos Funcionales

### 4.1 Sesión de Workflow

> _Por escribir. Núcleo del producto. Cubre modelo conceptual ("sesión de dos cabezas"), modos (planning / fetching / building / closing), eventos del workflow, ciclo de vida y la mecánica de optimistic UI + event sourcing (D1). Sub-secciones: 4.1.1 modelo, 4.1.2 modos y eventos, 4.1.3 ciclo de vida (incluye D3 y Q6)._

### 4.2 Cross-device Pairing

#### 4.2.1 Remote Control Mode (default, persistente)

> _Por escribir. Cubre flujo de activación, TTL (Q2), indicador "EN VIVO" en desktop, lista de dispositivos conectados, audit trail (Q11), revocación, un-desktop-a-la-vez, auto-pausa por inactividad._

#### 4.2.2 Pairing in-situ (QR efímero) — pendiente Q7

> _Por escribir si Q7 se decide a favor de v1. Si Q7 difiere, esta sub-sección se mueve a §8._

### 4.3 Vista Guiada Cross-device

> _Por escribir. UX específica de la Escena A: desktop como "cerebro" (panorama, BOM, schematic, resumen), mobile como "sentidos y manos" (scanner, cámara, voz, ubicación). Sincronización en vivo (tachado simultáneo, "próxima pieza")._

### 4.4 Inventario

> _Por escribir. Base sigue de v0.4 §3.1 con cambios menores: los componentes son datos consumidos por el workflow, no destinos. CRUD, búsqueda, detalle, datos por componente (sku, name, category, platform_family, connectivity_caps, quantity, technical_specs, image_url, datasheet_url, location_id) — todo se mantiene. ACs se rescriben con D13 (interacción consistente) y D14 (layouts escalables) como principios._

### 4.5 Ubicaciones

> _Por escribir. Base sigue de v0.4 §3.3 sin cambios estructurales. Jerarquía, asignación, vista de ubicación, ACs._

### 4.6 Scan IA

> _Por escribir. Base sigue de v0.4 §3.2. Se mantiene como Should Have. El refactor del agente IA (D6) puede simplificar la implementación porque comparte infraestructura de contexto rico._

### 4.7 Etiquetas NFC para Ubicaciones

> _Por escribir. Reemplaza el módulo "QR de Etiqueta Física" de v0.4. Mecanismo primario para identificación física de ubicaciones según D15. Cubre: programación del tag en el alta de la ubicación (vinculado al UUID), lectura desde mobile (Web NFC API en Android; fallback iOS pendiente Q13), formato NDEF del payload (Q14), hardware recomendado (Q12), distinción explícita respecto al pairing in-situ §4.2.2 — el tag NFC es etiqueta de ubicación física permanente, el QR del pairing in-situ (si Q7 lo aprueba) es token efímero de sesión cross-device. El QR para ubicaciones se difiere a v2 (§8)._

### 4.8 Proyectos

#### 4.8.1 Ciclo de vida y tipo

> _Por escribir. Base sigue de v0.4 §3.6.1: tipos DIY/Prototipo/Profesional, estados Guardado→En curso→Pausado→Completado/Abandonado. Sin cambios estructurales._

#### 4.8.2 BOM como workflow ejecutable

> _Por escribir. Cambio respecto a v0.4: el BOM no es solo una lista de materiales — es input al modo `fetching` del workflow. Al activar "buscar piezas", cada item del BOM se convierte en un objetivo de la sesión._

#### 4.8.3 Bitácora generada por eventos

> _Por escribir. D5 desarrollada. La bitácora es una proyección del log de `workflow_events`. Tipos de eventos visibles, eventos editables, política de Q10._

#### 4.8.4 Consumo via eventos

> _Por escribir. Cambio respecto a v0.4 §3.6.3: el consumo deja de ser marcado manual primario y pasa a derivarse de eventos del workflow (`item_used`, `item_returned`). El marcado manual queda como fallback explícito._

### 4.9 Inteligencia de Proyectos (Could Have)

#### 4.9.1 Descubrimiento ("¿qué puedo construir?")

> _Por escribir. Base de v0.4 §3.5.1. Degradado a Could Have — no es central a la visión nueva pero sigue siendo valioso._

#### 4.9.2 Planificación ("quiero construir X, ¿qué necesito?")

> _Por escribir. Base de v0.4 §3.5.2. Mismo status._

### 4.10 Agente IA Contextual

> _Por escribir. Sección nueva. Reemplaza el chat genérico actual (D6). Cubre cómo se invoca (desde cualquier vista con atajo o botón), qué contexto recibe (proyecto activo, BOM con specs completas, inventario, sesión, modo actual), capacidades (responder, sugerir, ejecutar acciones del workflow). Q9 vive acá._

#### 4.10.1 Invocación contextual

#### 4.10.2 Generación de código (Could Have)

> _Por escribir si Q8 entra en v1. Si difiere, se mueve a §8._

---

## 5. Requisitos No Funcionales

### 5.1 Multi-usuario + RLS

> _Por escribir. Base de v0.4 §4.1. Sin cambios estructurales._

### 5.2 PWA

> _Por escribir. Base de v0.4. PWA sigue siendo el contrato de distribución (no apps nativas en v1)._

### 5.3 Realtime + Sync Cross-device

> _Por escribir. Sección nueva. D1 desarrollada como NFR. Eventos, channels, garantías (at-least-once con idempotencia), reconciliación, latencia objetivo de roundtrip._

### 5.4 Performance

> _Por escribir. Revisado respecto a v0.4: agregar latencia de eventos cross-device (objetivo p95), tiempo desde tap en mobile hasta render en desktop. D14 (layouts escalables) como NFR de rendering._

### 5.5 Seguridad

> _Por escribir. Revisado: agregar autenticación de pairing (tokens, TTL, audit), revocación de sesiones, "un desktop activo a la vez"._

### 5.6 Privacidad

> _Por escribir. Base de v0.4. Sin cambios estructurales — la sesión es del usuario, no se comparte._

### 5.7 Offline parcial + cola de eventos

> _Por escribir. Revisado respecto a v0.4: ya no es solo "lectura sin red". Ahora incluye cola IndexedDB para eventos no sincronizados, reintento exponencial, política de Q4._

### 5.8 Estándares de desarrollo

> _Por escribir. Base de v0.4 §4.3: TDD estricto, SOLID selectivo (SRP + DIP), KISS. Sin cambios._

---

## 6. Modelo de Datos (Anexo Técnico)

> _Por escribir. Anexo nuevo respecto a v0.4. Define las tablas nuevas: `workflow_session`, `workflow_events` (log append-only, particionable por mes a futuro), `remote_session`, `device_connections`. Explicita la decisión D2 (UUID7 en estas tablas) con la nota de Q1. Diagrama ERD opcional._

---

## 7. Roadmap Comercial y Plataformas

> _Por escribir. Base de v0.4 §7. Sin cambios estructurales — PWA como contrato hasta validar criterios para apps nativas._

---

## 8. Diferidos (Won't Have v1)

Funcionalidades diferidas a post-MVP. Sin AC en v0.5. Se reevalúan cuando haya tracción real de los módulos core o cuando aparezca un caso de uso que las justifique.

- **Comunidad** (forks de proyectos, comentarios, feed público): se difiere completa. El producto en v0.5 es para un maker o equipo chico (SD + CJ + early adopters), no una red social de proyectos.
- **Análisis de código standalone** fuera del contexto de un proyecto.
- **Soporte completo de Raspberry Pi** como plataforma de destino (la arquitectura mantiene `platform_family` para no bloquear esta extensión futura).
- **Pairing in-situ (QR efímero)** — pendiente Q7. Si Q7 difiere, esta línea queda; si Q7 va a v1, se elimina.
- **Generación de código contextual** — pendiente Q8. Si Q8 difiere, esta línea queda; si Q8 va a v1, se elimina.
- **Telemetría en tiempo real de dispositivos IoT** (reservado para fase 2).
- **Control de versiones de esquemáticos o código de firmware.**
- **Integración con tiendas o estimación de costos de componentes faltantes.**
- **QR para ubicaciones (diferido a v2)**. Razón: la generación de imagen sola no es suficiente — requiere pipeline completo de impresión que acompañe al usuario al resultado físico (templates de hojas A4 con múltiples QRs por hoja, dimensiones recomendadas para etiquetas autoadhesivas estándar, layouts consistentes con el papel que usa el usuario). Sin ese pipeline, la feature genera fricción en lugar de utilidad — el aprendizaje que motivó D16. En v1 se reemplaza por NFC (D15). Se reevalúa en v2 cuando haya capacidad de diseño para entregar el pipeline completo end-to-end.

---

## 9. Glosario

> _Por escribir. Mantiene los términos de v0.4 (componente, ubicación, BOM, RLS, QR, platform_family, connectivity_caps, tipo de proyecto, incompatible, refinamiento guiado) y agrega los nuevos: workflow_session, remote_session, workflow_event, modo (planning/fetching/building/closing), partner del workflow, sesión de dos cabezas, optimistic UI, event sourcing, cola de eventos._
