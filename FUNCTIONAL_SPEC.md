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
| D17 | NFC en v1 Android-only; iOS diferido | Web NFC API no está soportada en iOS Safari. En v1 la PWA en iOS funciona normalmente para todo el producto **excepto** la lectura de tags NFC, que queda desactivada. Los usuarios iOS asignan ubicación a componentes via selección manual en el formulario. El soporte iOS de NFC se aborda post-MVP con flujo distinto (Camera+NDEF URI con deep link a la PWA, app nativa wrapper, o eventual soporte de Web NFC en iOS si llega). | §4.7, §5.2                  |

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

Tabla canónica de priorización del v0.5. Refleja las decisiones D1–D17 y los módulos definidos en §4. Los items marcados con (Q*) dependen de open questions cuya resolución puede moverlos entre columnas.

**Cambios estructurales respecto a v0.4**:

- Pasan a **Must Have** (nuevos o promovidos): Sesión de Workflow, Cross-device Pairing (Remote Control), Vista Guiada, Realtime + Sync, Identidad del producto, Agente IA Contextual.
- **Degrada** a Could Have: Generación de código (era Should Have).
- **Sale completa** (a §8 Won't Have v1): Comunidad de proyectos.

| Prioridad | Módulo / Capacidad | Sección | Justificación |
|---|---|---|---|
| **Must Have** | Auth + RLS + PWA | §5.1, §5.2 | Base técnica de multi-usuario y mobile. Sin esto no hay producto. |
| **Must Have** | Identidad del producto (voz, microcopy, D13, D14) | §2 | Diferenciador que evita el "cuaderno tonto". Sin identidad coherente, v0.5 = v0.4 con eventos. |
| **Must Have** | Inventario (CRUD, búsqueda, detalle) | §4.4 | Core loop. Datos consumidos por el workflow. |
| **Must Have** | Ubicaciones (jerarquía) | §4.5 | Diferenciador vs planilla; input al modo `fetching`. |
| **Must Have** | Sesión de Workflow (núcleo) | §4.1 | Centro de gravedad de v0.5. Sin sesión, no hay partner del workflow. |
| **Must Have** | Cross-device Pairing — Remote Control mode | §4.2.1 | La promesa cross-device de la Escena A no funciona sin esto. |
| **Must Have** | Vista Guiada Cross-device | §4.3 | Manifestación de la sesión en dos pantallas complementarias. |
| **Must Have** | Realtime + Sync (optimistic UI + cola de eventos) | §5.3 | Tecnología subyacente que habilita el cross-device fluido (D1). |
| **Must Have** | Proyectos (ciclo de vida + BOM ejecutable + bitácora por eventos + consumo) | §4.8 | El BOM dispara el workflow; la bitácora cierra la Escena C. |
| **Must Have** | Agente IA Contextual (invocación + contexto rico) | §4.10.1 | Reemplaza el chat genérico actual (D6). Habilita Scan IA y futuros casos. |
| **Should Have** | Scan IA (alta por fotografía) | §4.6 | Reduce fricción de alta — pero el alta manual ya funciona como fallback. |
| **Should Have** | Etiquetas NFC para Ubicaciones (Android v1 — D17) | §4.7 | Diferenciador físico-digital. Asignación manual de ubicación queda como fallback en iOS. |
| **Could Have** | Inteligencia de Proyectos — Descubrimiento + Planificación | §4.9 | Alto valor potencial pero depende de inventario y proyectos maduros. Costoso en tokens IA. |
| **Could Have (Q8)** | Generación de código contextual desde el agente | §4.10.2 | Si Q8 difiere → pasa a Won't Have v1 (§8). |
| **Could Have (Q9)** | Escena B — el agente sugiere alternativas del inventario cuando falta una pieza | §4.10 | Si Q9 difiere → pasa a Won't Have v1. Caso de uso valioso de la visión. |
| **Could Have (Q7)** | Pairing in-situ (QR efímero) | §4.2.2 | Si Q7 difiere → pasa a Won't Have v1. Útil solo en dispositivos prestados / demos. |
| **Won't Have v1** | Todo lo de §8 Diferidos | §8 | Comunidad, análisis de código standalone, RasPi completo, QR de ubicaciones, NFC iOS, telemetría real-time, integración con tiendas. |

> **MVP mínimo absoluto (v0.5.0-alpha)**: Auth + Inventario + Ubicaciones + Sesión de Workflow + Remote Control + Vista Guiada + Realtime. Con esto se puede ejecutar la Escena A completa con un proyecto manual. Las Escenas B y C requieren agente contextual y bitácora por eventos respectivamente.

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

**Objetivo**: mantener un registro preciso del catálogo de componentes del usuario y de su asignación a ubicaciones físicas. En v0.5 los componentes son **datos consumidos por el workflow** (BOM, búsqueda guiada, fetching) — no destinos en sí mismos. La calidad del inventario determina la calidad de todas las experiencias del producto downstream.

**User stories**:

- **US-4.4.1**: Como maker, quiero registrar un componente con sus specs técnicas para saber exactamente qué tengo disponible sin revisar cajas físicamente.
- **US-4.4.2**: Como estudiante, quiero buscar en mi inventario por nombre o categoría para encontrar rápido la pieza que necesito.
- **US-4.4.3**: Como freelancer, quiero ver el detalle completo de un componente (specs, datasheet, cantidad, ubicación) para cotizar un proyecto sin abrir cajones.

**Funcionalidades**:

- **Alta manual** — el usuario ingresa nombre, categoría, cantidad, especificaciones técnicas y ubicación.
- **Alta por fotografía** — flujo alternativo via Scan IA (§4.6) que pre-rellena los campos.
- **Edición y baja** — actualización de cantidad, notas, specs y ubicación. Baja lógica con historial.
- **Búsqueda y filtrado** — por nombre, categoría, especificación técnica, plataforma, conectividad y ubicación.
- **Vista de detalle** — ficha completa: imagen, datasheet vinculado, specs normalizadas, capacidades de conectividad, cantidad disponible, ubicación y enlaces a proyectos que lo usan.

**Datos por componente**:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `UUID` (UUIDv4 — D2) | PK |
| `sku` | `TEXT` | Identificador interno (ej. `MCU-001`) |
| `name` | `TEXT` | Nombre técnico (ej. "ESP32-C6 XIAO") |
| `category` | `ENUM` | Microcontrolador, Sensor, Actuador, Alimentación, Módulo, Pasivo |
| `platform_family` | `ENUM` | Familia: `esp32`, `arduino`, `rpi`, `generic` |
| `connectivity_caps` | `JSONB` | Capacidades: WiFi, BLE, LoRa, Zigbee, Thread, Ethernet, etc. |
| `quantity` | `INTEGER` | Unidades disponibles ≥ 0 |
| `technical_specs` | `JSONB` | Specs flexibles: voltaje, corriente, protocolo, encapsulado, etc. |
| `image_url` | `TEXT` | Foto tomada por el usuario o asignada por el scan IA |
| `datasheet_url` | `TEXT` | Enlace al datasheet oficial |
| `location_id` | `UUID` | FK a `locations` (§4.5) |

**Criterios de aceptación** (D13 y D14 aplican a todos los ACs de este módulo sin excepción):

- **AC-4.4.1**: El usuario crea un componente manual ingresando nombre, categoría y cantidad → el componente aparece en la lista del inventario con los datos correctos.
- **AC-4.4.2**: El usuario escribe texto en el buscador → la lista filtra en tiempo real por nombre, SKU y ubicación, case-insensitive. El comportamiento del buscador es **idéntico en mobile y desktop** (D13).
- **AC-4.4.3**: El usuario abre el detalle de un componente → ve imagen (o placeholder), SKU, categoría, plataforma, conectividad, especificaciones técnicas, ubicación, cantidad y enlace a datasheet. El layout se adapta al dispositivo (D14): mobile usa stacked vertical para specs con valores largos; desktop usa grid 2-col. **Ningún valor se trunca silenciosamente** — los datos de lectura siempre escalan al contenido o se expanden con tap/click explícito.
- **AC-4.4.4**: El usuario edita campos de un componente existente (nombre, categoría, plataforma, conectividad, specs, ubicación) → los cambios persisten al recargar.
- **AC-4.4.5**: El usuario elimina un componente de su inventario → desaparece de la lista; si el componente fue contribuido al catálogo compartido (§4.2 de NFRs), la entrada del catálogo se mantiene.
- **AC-4.4.6**: El usuario selecciona un chip de categoría (MCU, Sensor, etc.) → la lista muestra solo componentes de esa categoría. El chip se ve y se comporta **idéntico en mobile y desktop** (D13).
- **AC-4.4.7**: En la lista del inventario, el target de click para "ver/editar componente" es la **fila completa**, idéntico en mobile y desktop (D13). No hay divergencia donde una plataforma reduzca el target a un ícono pequeño.
- **AC-4.4.8**: El usuario asigna una ubicación a un componente → el componente aparece en la vista de esa ubicación (§4.5) y su tarjeta muestra la ruta de ubicación (breadcrumb) en la lista del inventario.
- **AC-4.4.9**: El usuario ajusta la cantidad con controles +/− → el stock se actualiza inmediatamente. Los controles se diseñan por dispositivo (D14): touch targets adecuados en mobile, click targets adecuados en desktop.

### 4.5 Ubicaciones

**Objetivo**: organizar los componentes en una jerarquía de ubicaciones físicas (habitación → mueble/maleta → cajón/compartimento) y permitir localizar piezas rápidamente. En v0.5 las ubicaciones son **input al modo `fetching` del workflow** (§4.1): cuando el usuario activa "buscar piezas", el sistema sabe a qué ubicaciones ir y en qué orden.

**User stories**:

- **US-4.5.1**: Como maker, quiero organizar mis componentes en una jerarquía (rack → bandeja → caja) para encontrar físicamente cualquier pieza en segundos.
- **US-4.5.2**: Como usuario, quiero ver qué componentes hay en una ubicación específica para saber qué tengo en cada caja sin abrirla.

**Funcionalidades**:

- **Creación de ubicaciones** — nombre descriptivo (ej. "Maletín Azul", "Cajón 3 — Escritorio") con padre opcional.
- **Jerarquía flexible** — hasta N niveles, sin profundidad fija (ej. `Rack > Bandeja > Caja chica`).
- **Asignación de componentes** — al crear o editar un componente, el usuario selecciona ubicación desde un árbol o buscador.
- **Vista de ubicación** — al abrir una ubicación, se lista los componentes propios y los de sub-ubicaciones.
- **Vinculación a tag NFC** (§4.7, v1 Android-only) — opcional, se hace después de crear la ubicación.

**Modelo de datos**:

```text
locations
├── id              UUID v4 (PK)
├── user_id         UUID (FK → auth.users)
├── parent_id       UUID (FK → locations, nullable)
├── name            TEXT
└── nfc_tag_uid     TEXT UNIQUE NULL    -- UID del tag NFC programado; null hasta vincular
```

> El campo `nfc_tag_uid` reemplaza al `qr_code` que existía en v0.4. Es nullable porque vincular un tag es opcional y se hace post-creación.

**Criterios de aceptación**:

- **AC-4.5.1**: El usuario crea una ubicación raíz con nombre descriptivo → aparece en el árbol de ubicaciones.
- **AC-4.5.2**: El usuario crea una sub-ubicación bajo una existente → aparece anidada bajo su padre.
- **AC-4.5.3**: El usuario abre el detalle de una ubicación → ve nombre, breadcrumb de jerarquía, sub-ubicaciones y lista de componentes (propios + descendientes) con nombre, cantidad y categoría. El layout sigue D14 (diseñado por dispositivo).
- **AC-4.5.4**: El usuario edita el nombre de una ubicación → el cambio persiste al recargar.
- **AC-4.5.5**: El usuario elimina una ubicación con componentes asignados → el sistema advierte antes de eliminar. Si el usuario confirma, los componentes quedan **sin ubicación** (no se eliminan); pueden reasignarse después.
- **AC-4.5.6**: Cada nodo del árbol muestra el conteo de componentes (propios + descendientes acumulados).
- **AC-4.5.7**: En el listado/árbol de ubicaciones, el target de click para "ver ubicación" es la **fila completa**, idéntico en mobile y desktop (D13).
- **AC-4.5.8**: La vista de una ubicación con tag NFC vinculado muestra un indicador del estado del tag (vinculado/sin vincular) y un botón para programar o desvincular (§4.7).

### 4.6 Scan IA (alta de componentes por fotografía)

**Objetivo**: reducir la fricción del alta de inventario permitiendo fotografiar una pieza y que el sistema la identifique automáticamente, extrayendo nombre, categoría, plataforma, conectividad y especificaciones técnicas. En v0.5 el scan IA es **un caso de uso del agente IA contextual** (§4.10) — comparte el mismo backend y el mismo principio de "contexto rico al modelo".

**User stories**:

- **US-4.6.1**: Como maker, quiero fotografiar un componente desconocido para que el sistema lo identifique sin tener que buscar el datasheet manualmente.
- **US-4.6.2**: Como usuario, quiero revisar y corregir la sugerencia de la IA antes de guardar, para asegurarme de que los datos son correctos.

**Flujo**:

1. El usuario abre el flujo de alta de componente y selecciona *"Escanear con cámara"*.
2. La aplicación captura o permite subir una imagen del componente.
3. La imagen se envía al agente IA (§4.10), que consulta un modelo de visión (ej. Claude Vision / GPT-4o).
4. El modelo retorna:
   - Nombre probable del componente
   - Categoría sugerida
   - `platform_family` (esp32, arduino, rpi, generic)
   - `connectivity_caps` (WiFi, BLE, LoRa, Zigbee, Thread, Ethernet, etc.)
   - `technical_specs` inferidas (voltaje de operación, interfaz, encapsulado)
   - Referencia al datasheet cuando es identificable
5. **Disambiguación**: si el modelo detecta 2 o más componentes posibles con confianza similar (ej. ESP32-S2 vs ESP32-S3), presenta las opciones al usuario para que elija.
6. El sistema presenta los datos en un formulario pre-rellenado para **revisión y confirmación** antes de guardar.
7. El usuario puede corregir cualquier campo antes de confirmar el alta.

**Consideraciones**:

- El resultado de la IA es **siempre una sugerencia** — nunca se guarda sin confirmación explícita del usuario.
- La detección aplica a todos los tipos de componentes, no solo MCUs. Un módulo LoRa SX1276, por ejemplo, también registra su conectividad.
- La imagen original se almacena como referencia visual del componente en el inventario.
- Identificaciones de **baja confianza** muestran un aviso explícito pidiendo confirmación.
- El módulo respeta D6: el agente IA tiene acceso al inventario actual del usuario y puede sugerir *"esto se parece a un componente que ya tenés (ESP32-C6 XIAO, cajón-A-2). ¿Es el mismo o uno nuevo?"* para evitar duplicados.

**Criterios de aceptación**:

- **AC-4.6.1**: El usuario sube una foto de un componente → la IA retorna nombre, categoría, plataforma, conectividad y specs → los datos aparecen en un formulario pre-rellenado para revisión.
- **AC-4.6.2**: Si la IA identifica con baja confianza → el sistema muestra un aviso explícito pidiendo confirmación antes de guardar.
- **AC-4.6.3**: Si la IA detecta múltiples candidatos con confianza similar → presenta las opciones para que el usuario elija manualmente.
- **AC-4.6.4**: El usuario puede corregir cualquier campo sugerido por la IA antes de confirmar el alta.
- **AC-4.6.5**: La imagen original queda almacenada y vinculada al componente como referencia visual.
- **AC-4.6.6**: El formulario de revisión se adapta al dispositivo (D14): mobile usa stacked vertical con la foto arriba; desktop usa layout side-by-side con la foto a la izquierda y los campos a la derecha.
- **AC-4.6.7**: Antes de guardar, si el agente detecta que el componente sugerido se parece a uno existente en el inventario del usuario, presenta la posibilidad de actualizar cantidad en lugar de crear nuevo.

### 4.7 Etiquetas NFC para Ubicaciones

**Objetivo**: vincular el mundo físico con el inventario digital mediante etiquetas NFC pegadas en cajones, estantes y contenedores. Al acercar el teléfono a la etiqueta, el sistema abre la ficha de esa ubicación o emite un evento del workflow si hay una sesión activa. Reemplaza al QR del v0.4 (D15) por hardware barato, lectura instantánea y mejor UX en mobile.

**Distinción importante**: el tag NFC de §4.7 es una **etiqueta de ubicación física permanente**. Si Q7 aprueba el pairing in-situ por QR efímero, ese QR (en §4.2.2) es un **token efímero de sesión cross-device** — son dos mecanismos distintos para problemas distintos, no se confunden.

**Restricción de plataforma** (D17): v1 entrega NFC **solo en Android** (Chrome via Web NFC API). En iOS Safari el módulo de lectura NFC está desactivado; los usuarios iOS usan el resto del producto normalmente y asignan ubicación a componentes via selección manual en el formulario. El soporte iOS se aborda post-MVP.

**User stories**:

- **US-4.7.1**: Como maker, quiero programar un tag NFC para cada ubicación física para que escanearla me muestre qué tiene adentro sin abrirla.
- **US-4.7.2**: Como usuario (Android), quiero acercar el teléfono a una etiqueta NFC y ver qué componentes hay en esa ubicación, sin abrir el cajón.
- **US-4.7.3**: Durante una sesión de `fetching`, quiero que escanear el tag de una ubicación me confirme que estoy en el lugar correcto y haga avanzar el workflow.

**Hardware** (Q12 pendiente):

El módulo asume un **writer NFC USB conectado al desktop** para la programación inicial, y **tags NTAG213/215/216 autoadhesivos** colocados físicamente en las ubicaciones. La marca y el modelo concretos quedan abiertos hasta cerrar Q12.

**Flujo de programación** (acompañado end-to-end — D16):

1. El usuario abre una ubicación existente y selecciona *"Vincular tag NFC"*.
2. El sistema inicia un wizard paso a paso:
   1. *"Conectá tu writer NFC USB al desktop"* — el sistema detecta el dispositivo y confirma.
   2. *"Generando el payload..."* — el sistema prepara el NDEF record con el contenido definido (formato pendiente Q14, tentativo `https://app/loc/<uuid>`).
   3. *"Acercá un tag virgen al writer"* — el writer escribe el NDEF al tag.
   4. *"Listo. Pegá la etiqueta en la ubicación física"* — el sistema marca el tag como vinculado guardando el UID del tag en `locations.nfc_tag_uid`.
3. El usuario puede desvincular y reprogramar un tag desde la vista de la ubicación.

**Flujo de lectura** (Android only en v1):

1. El usuario abre la PWA en Android y toca el botón *"Escanear NFC"* (o, si hay una sesión de workflow activa, la PWA escucha NFC automáticamente).
2. El usuario acerca el teléfono a la etiqueta.
3. La PWA lee el tag via Web NFC API, extrae el UUID de la ubicación.
4. La PWA navega a la ficha de la ubicación, o emite un evento del workflow (`location_scanned`) si hay una sesión activa que lo está esperando.

**Comportamiento en iOS** (v1):

- El botón *"Escanear NFC"* y el escuchado automático en sesiones están **deshabilitados**.
- En las pantallas afectadas, el sistema muestra una nota corta: *"El escaneo NFC todavía no está disponible en iOS. Asigná la ubicación manualmente."*
- La asignación de componente a ubicación, la navegación a una ubicación, y el avance del workflow funcionan normalmente via selección manual / botones.

**Modelo de datos**:

El módulo no agrega tablas nuevas. La vinculación tag→ubicación vive en el campo `locations.nfc_tag_uid` definido en §4.5. El UID hardcoded del tag físico (NTAG UID, 7 bytes hex) es identificador suficiente — no hay metadata adicional del tag.

**Criterios de aceptación**:

- **AC-4.7.1**: El usuario inicia el wizard de programación → el sistema lo guía paso a paso hasta que el tag está escrito y vinculado a la ubicación. Cada paso muestra el estado del hardware y bloquea hasta el OK.
- **AC-4.7.2**: El sistema confirma el éxito de la escritura **solo después** de que el writer reportó el OK del hardware. Si el writer falla, el wizard explica el error y permite reintentar.
- **AC-4.7.3**: Un tag programado no puede vincularse a una segunda ubicación sin desvincularse explícitamente primero (UNIQUE constraint en `locations.nfc_tag_uid`).
- **AC-4.7.4**: En Android, el usuario acerca el teléfono a una etiqueta vinculada → la PWA abre la ficha de la ubicación si no hay sesión activa, o emite el evento `location_scanned` si la hay.
- **AC-4.7.5**: En iOS (v1), el módulo de lectura NFC está desactivado. El resto del producto funciona normalmente. Las pantallas afectadas muestran una nota explicando que la asignación se hace manualmente.
- **AC-4.7.6**: El usuario puede desvincular un tag desde la vista de la ubicación → el `nfc_tag_uid` se limpia y el tag físico queda *sin asignar* (puede reprogramarse y reutilizarse en otra ubicación).
- **AC-4.7.7**: La vista de ubicación (§4.5) muestra un indicador claro del estado del tag (*"Vinculado"* / *"Sin vincular"*) con el botón correspondiente para programar o desvincular.

### 4.8 Proyectos

#### 4.8.1 Ciclo de vida y tipo

Al crear o guardar un proyecto, el usuario declara su **tipo**, que determina el nivel de detalle técnico esperado y los defaults de visibilidad. El ciclo de vida es independiente del tipo.

**Tipos de proyecto**:

| Tipo | Descripción | Visibilidad por defecto |
|---|---|---|
| **DIY** | Proyecto personal o de hobby; código simple (Arduino, ESPHome, MicroPython). | Pública si el usuario lo publica (sin efecto práctico en v1: Comunidad diferida — §8) |
| **Prototipo** | Funcional pero no optimizado; punto intermedio entre exploración y producción. | Idem DIY |
| **Profesional** | Orientado a producción: C/C++/Rust, eficiencia energética, manejo robusto de errores, código modular. | Privada por defecto |

**Estados del proyecto**:

```text
Guardado → En curso → Pausado → Completado
                              ↘ Abandonado
```

| Estado | Descripción |
|---|---|
| **Guardado** | El proyecto fue creado manualmente o guardado desde Inteligencia de Proyectos (§4.9), pero aún no se inició. |
| **En curso** | El usuario inició el proyecto activamente. Una sesión de workflow (§4.1) puede arrancarse desde este estado. |
| **Pausado** | Trabajo interrumpido temporalmente; conserva el historial completo de eventos. |
| **Completado** | El proyecto fue terminado. |
| **Abandonado** | Se descartó; el historial queda disponible para referencia. |

**Criterios de aceptación**:

- **AC-4.8.1**: El usuario crea un proyecto manual con título, tipo (DIY/Prototipo/Profesional) y dificultad → aparece en la lista en estado "Guardado".
- **AC-4.8.2**: El usuario cambia el estado del proyecto siguiendo las transiciones válidas: Guardado → En curso → Pausado/Completado/Abandonado. Las transiciones inválidas no están disponibles en la UI.
- **AC-4.8.3**: El usuario edita título y descripción del proyecto inline → los cambios persisten al recargar.
- **AC-4.8.4**: La transición a "En curso" habilita el botón para iniciar una sesión de workflow (§4.1). En cualquier otro estado, ese botón está deshabilitado con tooltip explicativo.

#### 4.8.2 BOM como workflow ejecutable

**Cambio conceptual clave respecto a v0.4**: el BOM no es solo una lista de materiales — es **input al modo `fetching` del workflow** (§4.1). Al activar *"buscar piezas"* desde un proyecto En curso, cada item del BOM se convierte en un objetivo de la sesión que la vista guiada (§4.3) cumple paso a paso.

**Estados de cada item en el BOM** (cruzados con el inventario actual del usuario en tiempo real):

| Estado | Color | Descripción |
|---|---|---|
| **Disponible** | Verde | El usuario tiene cantidad suficiente y el componente es compatible con los requisitos del proyecto. |
| **Parcial** | Ámbar | Tiene el componente pero en cantidad insuficiente. |
| **Faltante** | Rojo | No está en inventario; debe adquirirse antes de ejecutar el proyecto. |
| **Incompatible** | Naranja | Está en inventario pero no cumple un requisito del proyecto (ej. falta WiFi). La app sugiere alternativas — sujeto a Q9. |

**Funcionalidades**:

- Agregar / editar / eliminar items del BOM.
- Visualización del estado de cada item recalculada al cambiar cantidad o stock.
- Botón **"Iniciar fetching"** que arranca una sesión del workflow (§4.1) con el BOM como objetivo. Solo disponible si el proyecto está En curso (§4.8.1).

**Criterios de aceptación**:

- **AC-4.8.5**: El usuario agrega un componente a la BOM del proyecto con nombre y cantidad → aparece en la tabla con su estado calculado contra el inventario actual.
- **AC-4.8.6**: El usuario edita la cantidad de un item de BOM → el estado se recalcula (puede pasar de Disponible a Parcial si la nueva cantidad supera el stock).
- **AC-4.8.7**: El usuario elimina un item de BOM → desaparece de la tabla.
- **AC-4.8.8**: La BOM muestra el estado de cada item con el color correspondiente, **idéntico en mobile y desktop** (D13).
- **AC-4.8.9**: Cuando el proyecto está En curso, el usuario clickea "Iniciar fetching" → se crea una `workflow_session` en modo `fetching` con el BOM como input. La sesión queda lista para conectarse desde mobile (§4.2.1, remote control).
- **AC-4.8.10**: La vista del BOM se adapta al dispositivo (D14): mobile usa filas stacked con el estado prominente; desktop usa tabla compacta con columnas.

#### 4.8.3 Bitácora generada por eventos

**Decisión clave** (D5 desarrollada): la bitácora **NO es una entidad separada** con entries propias. Es una **proyección filtrada del log de `workflow_events`**. Las entries visibles se generan a partir de dos fuentes que conviven en el mismo log:

1. **Eventos del sistema** — generados automáticamente por la actividad del workflow: `session_started`, `mode_changed`, `item_found`, `item_used`, `item_returned`, `item_missing`, `location_scanned`, `session_closed`.
2. **Eventos manuales del usuario** — de tipo `journal_entry_added` con payload `{ text, tags, images }`. El usuario escribe explícitamente.

La UI muestra ambos **mezclados en orden cronológico**, una sola línea de tiempo. El usuario ve una bitácora, no dos.

**Tags disponibles en entries manuales**: `avance`, `problema`, `solución`, `aprendizaje`, `código`. Los eventos del sistema tienen su tag implícito según el tipo de evento.

**Edición y supresión de entries**:

- Las entries manuales se editan generando un evento `journal_entry_edited` (la UI muestra solo la última versión; el historial queda en el log).
- Las entries auto-generadas se pueden **ocultar** (no borrar) generando `journal_entry_hidden`. El evento original sigue en el log para audit.
- **Política de reproyección retroactiva** al agregar tipos de evento nuevos en futuro: **Q10 pendiente**.

**Conflicts cross-device**: si dos dispositivos editan la misma entry al mismo tiempo, la resolución es last-write-wins con notificación visible al usuario afectado. UX exacta del aviso: **Q5 pendiente**.

**Resumen automático al cerrar sesión** (Escena C):

Cuando una `workflow_session` cierra, el sistema agrega los eventos significativos de esa sesión y genera un **resumen narrativo automático** que se presenta al usuario como una entry tipo `session_summary` editable. El usuario aprueba el resumen tal cual, lo edita, o lo descarta antes de que se persista como entry visible en la bitácora.

**Criterios de aceptación**:

- **AC-4.8.11**: La bitácora muestra eventos del sistema y entries manuales mezclados en orden cronológico, identificados visualmente por su origen (icono + tag).
- **AC-4.8.12**: El usuario agrega una entry manual con texto + tags → se emite `journal_entry_added` y la entry aparece en la bitácora.
- **AC-4.8.13**: El usuario edita una entry manual → se emite `journal_entry_edited`; la versión anterior queda en el log pero la UI muestra solo la última.
- **AC-4.8.14**: El usuario oculta una entry auto-generada → se emite `journal_entry_hidden`; la UI deja de mostrarla; el evento original queda en el log.
- **AC-4.8.15**: La bitácora se adapta al dispositivo (D14): mobile usa cards verticales con timeline lateral; desktop usa lista densa con columna de tiempo.
- **AC-4.8.16**: Al cerrar una sesión de workflow, el sistema genera un resumen narrativo automático de los eventos de esa sesión. El usuario puede editar, aprobar o descartar el resumen antes de que se persista como entry tipo `session_summary`.

#### 4.8.4 Consumo via eventos

**Cambio respecto a v0.4 §3.6.3**: el consumo de componentes deja de ser un marcado manual primario y pasa a **derivarse de eventos del workflow** durante una sesión activa. El marcado manual queda como fallback explícito para escenarios fuera de sesión.

**Fuentes de consumo**:

| Fuente | Trigger | Evento emitido | Efecto |
|---|---|---|---|
| **Workflow activo** (primario) | El usuario marca un item como "usado" en la vista guiada (§4.3) durante una sesión `fetching`/`building` | `item_used` (sin flag manual) | Decrementa `components.quantity` |
| **Devolución** | El usuario devuelve un item al inventario, durante o después de la sesión | `item_returned` (referencia el `item_used` original) | Restaura `components.quantity` |
| **Marcado manual** (fallback) | El usuario marca un item del BOM como consumido fuera de una sesión activa | `item_used` con `payload.manual: true` | Mismo efecto sobre stock |

**Reglas de stock**:

- Si la cantidad cae a 0 o queda en nivel insuficiente para otros proyectos que dependen del componente, la vista del proyecto muestra una alerta visible y la lista de inventario marca el componente como agotado o casi agotado.
- El usuario puede revertir un consumo individual desde la entry correspondiente de la bitácora (botón "deshacer") — se emite `item_returned` referenciando el `item_used` original.
- El stock se ajusta al **persistir** el evento en el log (parte del flujo de event sourcing — D1). El cliente aplica el cambio en optimistic UI, la cola sincroniza, y si el server rechaza el evento (caso límite raro), el cliente hace rollback con toast.

**Criterios de aceptación**:

- **AC-4.8.17**: Durante una sesión de workflow, el usuario marca un item como "usado" → se emite `item_used` → `components.quantity` del componente correspondiente se decrementa al persistir el evento.
- **AC-4.8.18**: El usuario marca un item como devuelto (durante o después de la sesión) → se emite `item_returned` referenciando el `item_used` original → `components.quantity` se restaura.
- **AC-4.8.19**: Fuera de una sesión activa, el usuario puede marcar manualmente un item del BOM como consumido → se emite `item_used` con `payload.manual: true` → mismo efecto sobre stock que el flujo del workflow.
- **AC-4.8.20**: Si la cantidad disponible cae a 0 o muy baja → la vista del proyecto muestra una alerta visible. El componente en la lista de inventario refleja el estado de stock bajo (badge o color).
- **AC-4.8.21**: El usuario puede revertir un consumo individual desde la entry correspondiente de la bitácora → se emite `item_returned` referenciando el evento original. La UI confirma con animación de rollback.

### 4.9 Inteligencia de Proyectos (Could Have)

**Objetivo del módulo**: convertir el inventario en un punto de partida para la creación de proyectos, conectando las piezas disponibles con proyectos realizables (Descubrimiento) y, a la inversa, identificando qué falta para ejecutar un proyecto deseado (Planificación). Ambas capacidades viven sobre el **agente IA contextual** (§4.10) — comparten infraestructura.

**Degradado a Could Have** respecto a v0.4 (era Should Have): la visión v0.5 se centra en el workflow de proyectos ya iniciados, no en el descubrimiento. La inteligencia de proyectos es valiosa pero no bloquea el MVP.

#### 4.9.1 Descubrimiento ("¿qué puedo construir?")

**Flujo**:

1. El usuario abre la sección *"Explorar Proyectos"*.
2. La app envía el inventario actual (componentes con specs, plataforma y conectividad) al agente IA.
3. El agente sugiere proyectos ordenados por viabilidad (porcentaje de piezas disponibles y compatibles).
4. Cada sugerencia incluye: título, descripción breve, BOM con el estado por ítem (reutiliza los estados definidos en §4.8.2: Disponible/Parcial/Faltante/Incompatible), nivel de dificultad estimado, recursos externos opcionales.

**Criterios de aceptación**:

- **AC-4.9.1**: El usuario abre *"Explorar Proyectos"* → el agente IA recibe el inventario completo y devuelve sugerencias ordenadas por viabilidad con título, descripción, dificultad y BOM.
- **AC-4.9.2**: Cada item de la BOM sugerida muestra su estado con el color correspondiente (§4.8.2). El layout se adapta al dispositivo (D14).
- **AC-4.9.3**: El usuario guarda una sugerencia → se crea un proyecto en estado `Guardado` con la BOM asociada y `source = 'ai_discovery'`.

#### 4.9.2 Planificación ("quiero construir X, ¿qué necesito?")

**Flujo**:

1. El usuario describe el proyecto en **texto libre** (ej. *"estación meteorológica solar con WiFi y pantalla OLED"*).
2. El agente IA genera una propuesta inicial: título, descripción, BOM sugerida, dificultad.
3. El sistema presenta controles de **refinamiento guiado** opcionales:
   - **Controlador preferido** — MCU del inventario o uno deseado. Si es incompatible con los requisitos, el agente sugiere alternativas (sujeto a Q9).
   - **Nivel de dificultad** — Principiante / Intermedio / Avanzado.
   - **Restricciones** — sin soldadura, bajo consumo, presupuesto máximo, etc.
4. El usuario acepta o ajusta la propuesta.
5. El sistema cruza la BOM final con el inventario y clasifica cada ítem (§4.8.2).
6. El usuario guarda la propuesta como nuevo proyecto en estado `Guardado` con `source = 'ai_plan'`.

**Criterios de aceptación**:

- **AC-4.9.4**: El usuario describe un proyecto en texto libre → el agente IA genera una propuesta con título, descripción, BOM y dificultad.
- **AC-4.9.5**: El usuario aplica refinamiento guiado (controlador, dificultad, restricciones) → la propuesta se actualiza con los nuevos parámetros.
- **AC-4.9.6**: El usuario guarda la propuesta → se crea un proyecto en estado `Guardado` con `source = 'ai_plan'` y BOM cruzada contra inventario.

**Consideraciones comunes a 4.9.1 y 4.9.2**:

- Las sugerencias del agente son orientativas; el usuario puede guardar, descartar o ajustar.
- El módulo NO gestiona compras ni se integra con tiendas en v1 (Won't Have — §8).
- Al guardar, el proyecto sigue el ciclo de vida normal de §4.8.1.

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
- **NFC en iOS (diferido post-MVP — relacionado con D17)**. Web NFC API no es soportada en iOS Safari. En v1 los usuarios iOS asignan ubicación al componente manualmente. Tres caminos de implementación a considerar cuando se aborde:
  - **Camino A — Esperar soporte nativo de Web NFC en iOS Safari.** Es el más limpio: una sola codebase PWA, paridad de UX con Android. Riesgo: Apple no ha anunciado planes públicos. No hay fecha realista — puede que no llegue nunca.
  - **Camino B — Camera + NDEF URI con deep link a la PWA.** El usuario escanea el tag NFC con la cámara nativa de iOS (que sí lee NDEF URI records desde iOS 14+). El URI dispara la apertura de la PWA en Safari con el deep link `https://app/loc/<uuid>`. Flujo más burocrático que Android (salir de la PWA, abrir Camera, volver), pero viable sin app nativa y compatible con el mismo formato NDEF que se decida en Q14. Recomendado como primer intento de soporte iOS.
  - **Camino C — App nativa wrapper (Capacitor, Tauri, similar).** Una app iOS que envuelve la PWA y expone Core NFC API nativamente. Da paridad de UX completa con Android pero rompe la decisión de PWA-only de v1, agrega ciclos de revisión de App Store y un codebase adicional a mantener. Considerar solo si la fricción del Camino B se vuelve un bloqueador real de adopción.

---

## 9. Glosario

> _Por escribir. Mantiene los términos de v0.4 (componente, ubicación, BOM, RLS, QR, platform_family, connectivity_caps, tipo de proyecto, incompatible, refinamiento guiado) y agrega los nuevos: workflow_session, remote_session, workflow_event, modo (planning/fetching/building/closing), partner del workflow, sesión de dos cabezas, optimistic UI, event sourcing, cola de eventos._
