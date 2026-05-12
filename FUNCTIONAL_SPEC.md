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
| D13 | Patrones de interacción consistentes    | Los listados, formularios y navegación siguen los mismos patrones en todos los módulos. Una decisión que se toma una vez (por ej. "qué es clickeable en una fila de listado") se aplica idéntica en inventario, ubicaciones, proyectos y BOM. Sin excepciones módulo-por-módulo.                  | §2.1 + módulos              |
| D14 | Layouts escalan con contenido           | Las vistas de detalle y listado se diseñan para soportar contenido variable (specs largas, descripciones extensas, nombres compuestos) sin desbordamiento del viewport ni truncamiento silencioso de datos de lectura. Si hay que truncar, es con tap-to-expand explícito, no con ellipsis muda. | §2 + §5.4                   |

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

---

## 1. Visión del Producto

> _Por escribir. Base: `.remember/vision-producto.md` §1. Cubre la frase central ("el producto te acompaña a hacer el proyecto"), la emoción objetivo (calma + competencia + complicidad), las tres escenas wuaw (A arranque, B falta pieza, C cierre), la tabla "cuaderno tonto → partner del workflow", los usuarios objetivo y las métricas (con D7 incluida)._

### 1.1 Una frase y emoción objetivo

### 1.2 Tres escenas wuaw

### 1.3 Lo que el producto deja de ser

### 1.4 Usuarios objetivo

### 1.5 Métricas de éxito

---

## 2. Identidad del Producto

> _Por escribir. Base: `.remember/vision-producto.md` §2. Sección nueva que no existía en v0.4. Cubre voz, personalidad en 5 ejes, referencias visuales (Linear, Raycast, Arc, Things 3, Granola, Continuity Camera; anti-referencias Stripe, Notion, ChatGPT) y microcopy antes/después. D13 y D14 viven acá como principios transversales._

### 2.1 Voz y microcopy

### 2.2 Personalidad en 5 ejes

### 2.3 Referencias visuales y de UX

### 2.4 Microcopy antes/después

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

### 4.7 QR de Etiqueta Física

> _Por escribir. Base sigue de v0.4 §3.4. Se distingue explícitamente del pairing in-situ (§4.2.2, si entra en v1): un QR es etiqueta de ubicación física permanente, el otro es token efímero de sesión._

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

---

## 9. Glosario

> _Por escribir. Mantiene los términos de v0.4 (componente, ubicación, BOM, RLS, QR, platform_family, connectivity_caps, tipo de proyecto, incompatible, refinamiento guiado) y agrega los nuevos: workflow_session, remote_session, workflow_event, modo (planning/fetching/building/closing), partner del workflow, sesión de dos cabezas, optimistic UI, event sourcing, cola de eventos._
