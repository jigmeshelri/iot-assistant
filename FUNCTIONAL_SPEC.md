# Especificación Funcional — IoT Assistant

**Versión:** 0.4
**Fecha:** 2026-03-25
**Estado:** Borrador — PRD con criterios de aceptación

---

## 1. Visión del Producto

### 1.1 Problema

Los makers, estudiantes y profesionales de electrónica acumulan componentes de múltiples fuentes — compras, kits, proyectos anteriores, donaciones — sin un sistema de registro que escale más allá de una planilla o la memoria. Las consecuencias son concretas:

- **Componentes duplicados:** se compran piezas que ya se tienen porque no se sabe qué hay en stock ni dónde está.
- **Proyectos bloqueados:** se abandona o posterga un proyecto porque no se sabe si se tienen las piezas necesarias, o se descubre a mitad de camino que falta un componente crítico.
- **Conocimiento perdido:** la experiencia de un proyecto terminado queda en la cabeza del maker, sin registro que permita replicarlo o compartirlo.
- **Inventario inerte:** una colección grande de componentes es un activo potencial, pero sin catálogo consultable es solo una caja de piezas sin contexto.

### 1.2 Oportunidad

No existe una herramienta que integre inventario de componentes electrónicos con inteligencia de proyectos. Las soluciones actuales son planillas manuales, apps genéricas de inventario (sin entender qué es un ESP32) o plataformas de proyectos IoT que no gestionan stock físico. IoT Assistant conecta ambos mundos.

### 1.3 Visión

IoT Assistant es una aplicación web progresiva (PWA) orientada a makers, estudiantes y profesionales de electrónica que necesitan gestionar su inventario de componentes de manera eficiente. A través de reconocimiento visual por IA, organización física con códigos QR e inteligencia de proyectos, la aplicación transforma una colección desordenada de piezas en un activo consultable y accionable.

### 1.4 Métricas de Éxito (KPIs)

**Métricas de producto (MVP):**

| Métrica | Objetivo v1 | Cómo se mide |
| :--- | :--- | :--- |
| Usuarios activos semanales (WAU) | 50+ | Supabase Auth sessions activas en 7 días |
| Retención semanal | > 40 % | WAU semana N / WAU semana N-1 |
| Componentes registrados por usuario | > 15 promedio | `COUNT(user_stock)` / `COUNT(DISTINCT user_id)` |
| % componentes con ubicación asignada | > 60 % | Señal de que el módulo de ubicaciones aporta valor real |
| Tasa de adopción de scan IA | > 30 % de altas | Altas via scan / total altas — valida si la IA reduce fricción |
| Proyectos creados por usuario activo | > 0.5 / mes | Señal de engagement más allá del inventario |

**Métricas de calidad:**

| Métrica | Objetivo | Notas |
| :--- | :--- | :--- |
| Precisión del scan IA | > 70 % sin corrección | % de scans donde el usuario acepta la sugerencia sin editar nombre ni categoría |
| Latencia scan IA (p95) | < 10 s | Desde envío de imagen hasta respuesta completa |
| Errores de RLS | 0 | Un usuario nunca debe ver datos de otro — monitoreado en logs |

> **Nota:** Los mockups visuales están en `mockups/index.html`. A medida que se definan flujos adicionales, cada módulo debería vincular a su mockup correspondiente.

---

## 2. Usuarios Objetivo

| Perfil | Descripción |
| :--- | :--- |
| **Maker / Hobbyist** | Acumula componentes de distintas fuentes y necesita saber qué tiene y dónde está. |
| **Estudiante de electrónica** | Gestiona un kit de laboratorio y quiere explorar proyectos con sus piezas actuales. |
| **Profesional / Freelancer** | Requiere trazabilidad de stock para cotizar proyectos y evitar compras duplicadas. |

---

## 2b. Priorización (MoSCoW)

| Prioridad | Módulo | Justificación |
| :--- | :--- | :--- |
| **Must Have** | 3.1 Inventario (CRUD, búsqueda, detalle) | Sin inventario no hay producto. Es el core loop. |
| **Must Have** | 3.3 Ubicaciones (CRUD, jerarquía) | Diferenciador vs planillas. Responde a "¿dónde está?" |
| **Must Have** | 4.0 Auth + RLS + PWA | Requisito técnico base para multi-usuario y móvil |
| **Should Have** | 3.2 Scan IA | Reduce fricción de alta — pero el alta manual ya funciona. Validar adopción post-launch. |
| **Should Have** | 3.4 QR | Completa la propuesta de ubicaciones. Sin QR, ubicaciones igual funcionan. |
| **Should Have** | 3.6 Proyectos (ciclo de vida, BOM, bitácora) | Engagement a largo plazo, pero el MVP puede validar sin esto. |
| **Should Have** | Alta masiva (CSV import) | Reduce barrera de entrada para usuarios con inventarios grandes. No bloquea MVP pero mitiga riesgo de abandono en onboarding (ver S4). |
| **Could Have** | 3.5 Inteligencia de Proyectos (descubrimiento + planificación IA) | Alto impacto potencial pero depende de 3.1 + 3.6 completos. Costoso en tokens IA. |
| **Could Have** | 3.6.4 Comunidad (publicación, forks, comentarios) | Requiere masa crítica de usuarios. Prematuro para MVP. |
| **Should Have** | 3.7.1 Generación de código (DIY/Prototipo) | Parte del flujo natural: Arduino IDE, ESPHome, MicroPython, PlatformIO. Completa el ciclo proyecto → código. |
| **Won't Have (v1)** | 3.7.1 Generación de código profesional (C++/Rust/ESP-IDF/Zephyr) | Entornos de alto nivel requieren contexto avanzado (memory management, energy optimization). Postergar hasta validar demanda. |
| **Won't Have (v1)** | 3.7.2 Análisis y mejora de código existente | Requiere pipeline de análisis más sofisticado. Postergar. |

> **MVP mínimo (v0.1):** Módulos 3.1 + 3.3 + Auth. Un usuario puede registrar componentes, organizarlos por ubicación y buscar su inventario. Esto ya resuelve el dolor principal.

---

## 3. Módulos Funcionales

### 3.1 Gestión de Inventario

**Objetivo:** Mantener un registro preciso y actualizado de todos los componentes electrónicos que el usuario posee.

**User Stories:**

- US-3.1.1: Como maker, quiero registrar un componente con sus specs técnicas para saber exactamente qué tengo disponible sin revisar cajas físicamente.
- US-3.1.2: Como estudiante, quiero buscar en mi inventario por nombre o categoría para encontrar rápido la pieza que necesito para un ejercicio de laboratorio.
- US-3.1.3: Como freelancer, quiero ver el detalle completo de un componente (specs, datasheet, cantidad, ubicación) para cotizar un proyecto sin abrir cajones.

**Funcionalidades:**

- **Alta de componente manual** — el usuario ingresa nombre, categoría, cantidad, especificaciones técnicas y ubicación.
- **Alta de componente por fotografía** (ver módulo 3.2) — flujo alternativo que pre-rellena los campos automáticamente.
- **Edición y baja** — actualización de cantidad, notas, especificaciones y ubicación. Baja lógica con historial.
- **Búsqueda y filtrado** — por nombre, categoría, especificación técnica (voltaje, protocolo, encapsulado) y ubicación.
- **Vista de detalle** — ficha completa del componente: imagen, datasheet vinculado, especificaciones normalizadas, capacidades de conectividad detectadas, cantidad disponible e historial de movimientos.

**Datos por componente:**

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `sku` | `TEXT` | Identificador único interno (ej. `MCU-001`) |
| `name` | `TEXT` | Nombre técnico (ej. "ESP32-C6 XIAO") |
| `category` | `ENUM` | Microcontrolador, Sensor, Actuador, Alimentación, Módulo, Pasivo |
| `platform_family` | `ENUM` | Familia de plataforma: `esp32`, `arduino`, `rpi`, `generic` |
| `connectivity_caps` | `JSONB` | Capacidades de conectividad detectadas: WiFi, BLE, LoRa, Zigbee, Thread, Ethernet, etc. |
| `quantity` | `INTEGER` | Unidades disponibles ≥ 0 |
| `technical_specs` | `JSONB` | Specs flexibles: voltaje, corriente, protocolo, encapsulado, etc. |
| `image_url` | `TEXT` | Foto tomada por el usuario |
| `datasheet_url` | `TEXT` | Enlace al datasheet oficial |
| `location_id` | `UUID` | FK a la ubicación física (módulo 3.3) |

**Criterios de aceptación:**

- **AC-3.1.1**: El usuario crea un componente manual ingresando nombre, categoría y cantidad → el componente aparece en la lista de inventario con los datos correctos.
- **AC-3.1.2**: El usuario escribe texto en el buscador → la lista filtra en tiempo real por nombre, SKU y ubicación (case-insensitive).
- **AC-3.1.3**: El usuario abre el detalle de un componente → ve imagen (o placeholder), SKU, categoría, plataforma, conectividad, especificaciones técnicas, ubicación, cantidad y enlace a datasheet.
- **AC-3.1.4**: El usuario edita campos de un componente existente (nombre, categoría, plataforma, conectividad, specs, ubicación) → los cambios persisten al recargar la página.
- **AC-3.1.5**: El usuario elimina un componente de su inventario → desaparece de la lista; el componente sigue existiendo en el catálogo compartido.
- **AC-3.1.6**: El usuario selecciona un chip de categoría (MCU, Sensor, etc.) → la lista muestra solo componentes de esa categoría.
- **AC-3.1.7**: El usuario asigna una ubicación a un componente → el componente aparece en la vista de esa ubicación y muestra la ruta de ubicación en su tarjeta de inventario.
- **AC-3.1.8**: El usuario ajusta la cantidad con botones +/− → el stock se actualiza inmediatamente en la base de datos.

---

### 3.2 Reconocimiento de Componentes por IA

**Objetivo:** Reducir la fricción del alta de inventario permitiendo que el usuario fotografíe una pieza y el sistema la identifique automáticamente, extrayendo además sus capacidades técnicas y de conectividad.

**User Stories:**

- US-3.2.1: Como maker, quiero fotografiar un componente desconocido para que el sistema lo identifique sin tener que buscar el datasheet manualmente.
- US-3.2.2: Como usuario, quiero revisar y corregir la sugerencia de la IA antes de guardar, para asegurarme de que los datos son correctos.

**Flujo:**

1. El usuario abre el flujo de alta y selecciona la opción **"Escanear con cámara"**.
2. La aplicación captura o permite subir una imagen del componente.
3. La imagen se envía al microservicio FastAPI, que consulta un modelo de visión (ej. Claude Vision / GPT-4o).
4. El modelo retorna:
   - Nombre probable del componente
   - Categoría sugerida
   - Familia de plataforma (`platform_family`: esp32, arduino, rpi, generic)
   - Capacidades de conectividad detectadas (`connectivity_caps`: WiFi, BLE, LoRa, Zigbee, Thread, Ethernet, etc.)
   - Especificaciones técnicas inferidas (voltaje de operación, interfaz, encapsulado)
   - Enlace o referencia al datasheet cuando sea identificable
5. **Disambiguación:** si el sistema detecta dos o más componentes posibles con especificaciones similares y no puede determinar el correcto con suficiente confianza, presenta al usuario las opciones para que elija manualmente. Esto aplica especialmente a variantes de la misma familia (ej. ESP32-S2 vs ESP32-S3).
6. El sistema presenta los datos al usuario en un formulario pre-rellenado para **revisión y confirmación** antes de guardar.
7. El usuario puede corregir cualquier campo antes de confirmar el alta.

**Consideraciones:**
- El resultado de la IA es una sugerencia, nunca se guarda sin confirmación del usuario.
- La detección de capacidades aplica a todos los tipos de componentes, no solo MCUs. Un módulo LoRa SX1276, por ejemplo, también registra su conectividad.
- La imagen original se almacena como referencia visual del componente en inventario.
- El sistema debe manejar identificaciones de baja confianza mostrando un aviso y solicitando confirmación explícita.

**Criterios de aceptación:**

- **AC-3.2.1**: El usuario sube una foto de un componente → la IA retorna nombre, categoría, plataforma, conectividad y specs → los datos aparecen en un formulario pre-rellenado para revisión.
- **AC-3.2.2**: Si la IA identifica el componente con baja confianza → el sistema muestra un aviso explícito pidiendo confirmación antes de guardar.
- **AC-3.2.3**: El usuario puede corregir cualquier campo sugerido por la IA antes de confirmar el alta.
- **AC-3.2.4**: La imagen original se almacena como referencia visual del componente en el inventario.

---

### 3.3 Gestión de Ubicaciones Físicas

**Objetivo:** Permitir al usuario organizar sus componentes en una jerarquía de ubicaciones físicas (habitación → mueble / maleta → cajón / compartimento) y localizar piezas rápidamente.

**User Stories:**

- US-3.3.1: Como maker, quiero organizar mis componentes en una jerarquía de ubicaciones (rack → bandeja → caja) para encontrar físicamente cualquier pieza en segundos.
- US-3.3.2: Como usuario, quiero ver qué componentes hay en una ubicación específica para saber qué tengo en cada caja sin abrirla.

**Funcionalidades:**

- **Creación de ubicaciones** — el usuario define un nombre descriptivo (ej. "Maletín Azul", "Cajón 3 — Escritorio") y opcionalmente la anida bajo otra ubicación padre.
- **Jerarquía flexible** — hasta N niveles (ej. `Rack > Bandeja > Caja chica`). Sin límite fijo de profundidad.
- **Asignación de componentes** — al crear o editar un componente, el usuario selecciona su ubicación desde un árbol o buscador.
- **Vista de ubicación** — al seleccionar una ubicación, la aplicación lista todos los componentes almacenados en ella y en sus sub-ubicaciones.
- **Generación de código QR** (ver módulo 3.4).

**Modelo de datos:**

```
locations
├── id          UUID (PK)
├── user_id     UUID (FK → auth.users)
├── parent_id   UUID (FK → locations, nullable)
├── name        TEXT
└── qr_code     TEXT (único, generado automáticamente)
```

**Criterios de aceptación:**

- **AC-3.3.1**: El usuario crea una ubicación raíz con nombre descriptivo → aparece en el árbol de ubicaciones.
- **AC-3.3.2**: El usuario crea una sub-ubicación bajo una ubicación existente → aparece anidada bajo su padre en el árbol.
- **AC-3.3.3**: El usuario abre el detalle de una ubicación → ve el nombre, jerarquía (breadcrumb), sub-ubicaciones y lista de componentes almacenados con nombre, cantidad y categoría.
- **AC-3.3.4**: El usuario edita el nombre de una ubicación → el cambio persiste al recargar.
- **AC-3.3.5**: El usuario elimina una ubicación → los componentes asignados a ella quedan sin ubicación (no se eliminan). Si la ubicación tiene componentes, el sistema advierte antes de eliminar.
- **AC-3.3.6**: Cada nodo del árbol muestra el conteo de componentes almacenados en esa ubicación.

---

### 3.4 Códigos QR para Ubicaciones

**Objetivo:** Vincular el mundo físico con el inventario digital mediante etiquetas QR imprimibles que, al ser escaneadas, muestran el contenido de esa ubicación.

**Flujo de generación:**

1. El usuario accede a una ubicación y selecciona **"Generar QR"**.
2. El sistema produce un código QR que codifica una URL del tipo `app.ejemplo.com/location/{qr_code}`.
3. La aplicación ofrece opciones de descarga (PNG) e impresión directa con formato de etiqueta (nombre de la ubicación + QR).

**Flujo de escaneo:**

1. El usuario escanea el QR con la cámara del dispositivo (cámara nativa o desde la PWA).
2. La aplicación resuelve la URL y muestra la ficha de la ubicación:
   - Nombre y jerarquía de la ubicación.
   - Lista de componentes almacenados con nombre, cantidad e imagen miniatura.
   - Acceso rápido para ajustar cantidades o reasignar componentes.

**Consideraciones:**
- El `qr_code` es inmutable una vez generado para garantizar que las etiquetas físicas impresas siempre sean válidas.
- El acceso a la vista de ubicación por QR requiere autenticación del usuario propietario.

**Criterios de aceptación:**

- **AC-3.4.1**: El usuario genera un QR para una ubicación → ve la imagen del QR con nombre y botones para descargar PNG e imprimir.
- **AC-3.4.2**: Un usuario escanea (o navega) la URL del QR → el sistema redirige a la vista de detalle de esa ubicación con la lista de componentes.

---

### 3.5 Inteligencia de Proyectos

**User Stories:**

- US-3.5.1: Como maker con muchos componentes, quiero que el sistema me sugiera qué puedo construir con lo que ya tengo, para darle uso a piezas que están juntando polvo.
- US-3.5.2: Como estudiante, quiero describir un proyecto que me interesa y saber qué me falta comprar, para planificar antes de empezar.

**Objetivo:** Convertir el inventario en un punto de partida para la creación, conectando las piezas disponibles con proyectos realizables y, a la inversa, identificando qué falta para ejecutar un proyecto deseado.

#### 3.5.1 Descubrimiento: "¿Qué puedo construir?"

**Flujo:**

1. El usuario abre la sección **"Explorar Proyectos"**.
2. La aplicación envía el inventario actual (lista de componentes, categorías, specs y capacidades de conectividad) al modelo de IA.
3. El modelo sugiere proyectos ordenados por viabilidad (porcentaje de piezas disponibles y compatibles).
4. Cada sugerencia incluye:
   - Título y descripción breve del proyecto.
   - Lista de componentes requeridos con su estado por ítem (ver tabla de estados abajo).
   - Nivel de dificultad estimado.
   - Recursos externos opcionales (tutoriales, esquemáticos).

**Estados de componente en la BOM sugerida:**

| Estado | Descripción |
| :--- | :--- |
| **Disponible** | El usuario tiene cantidad suficiente y el componente es compatible. |
| **Parcial** | Tiene el componente pero en cantidad insuficiente. |
| **Faltante** | No está en inventario; debe adquirirse. |
| **Incompatible** | Está en inventario pero no cumple el requisito del proyecto (ej. falta WiFi). La app sugiere: (a) un componente alternativo del inventario que sí cumple, o (b) un módulo externo que cubra la función faltante. |

#### 3.5.2 Planificación: "Quiero construir X, ¿qué necesito?"

**Flujo:**

1. El usuario describe el proyecto en **texto libre** (ej. "estación meteorológica solar con WiFi y pantalla OLED").
2. La IA genera una propuesta inicial: título, descripción, BOM sugerida y nivel de dificultad.
3. El sistema presenta la propuesta y ofrece controles de **refinamiento guiado** opcionales:
   - **Controlador preferido** — el usuario puede indicar un MCU de su inventario o uno que desea comprar. Si el controlador elegido es incompatible con los requisitos, la app avisa y sugiere: (a) un MCU alternativo del inventario, o (b) un módulo externo que cubra la función faltante.
   - **Nivel de dificultad** — Principiante / Intermedio / Avanzado.
   - **Restricciones** — por ejemplo: "sin soldadura", "bajo consumo", "menor a $20 USD en componentes faltantes".
4. El usuario acepta o ajusta la propuesta.
5. El sistema cruza la BOM final con el inventario y clasifica cada ítem según los mismos estados definidos en 3.5.1 (Disponible, Parcial, Faltante, Incompatible).
6. El usuario puede **guardar la propuesta directamente como nuevo proyecto** con su BOM generada, pasando al módulo 3.6 en estado `Guardado`.

**Consideraciones comunes a 3.5.1 y 3.5.2:**
- Las sugerencias de la IA son orientativas; el usuario puede guardar, descartar o compartir los resultados.
- El módulo no gestiona compras ni se integra con tiendas en esta versión. La estimación de costos y búsqueda de proveedores queda para una fase posterior.
- Al guardar un proyecto sugerido se crea automáticamente una entrada en el módulo 3.6.

**Criterios de aceptación (3.5.1 Descubrimiento):**

- **AC-3.5.1**: El usuario abre "Explorar Proyectos" → el sistema envía su inventario a la IA y muestra sugerencias ordenadas por viabilidad (%) con título, descripción, dificultad y BOM.
- **AC-3.5.2**: Cada item de la BOM sugerida muestra su estado: Disponible (verde), Parcial (ámbar), Faltante (rojo) o Incompatible (naranja con sugerencia de alternativa).
- **AC-3.5.3**: El usuario guarda una sugerencia → se crea un proyecto en estado "Guardado" con la BOM asociada.

**Criterios de aceptación (3.5.2 Planificación):**

- **AC-3.5.4**: El usuario describe un proyecto en texto libre → la IA genera una propuesta con título, descripción, BOM y dificultad.
- **AC-3.5.5**: El usuario aplica refinamiento guiado (controlador preferido, dificultad, restricciones) → la propuesta se actualiza con los nuevos parámetros.
- **AC-3.5.6**: El usuario guarda la propuesta → se crea un proyecto en estado "Guardado" con source "ai_plan".

---

### 3.6 Seguimiento y Comunidad de Proyectos

**Objetivo:** Una vez que el usuario decide ejecutar un proyecto — ya sea descubierto por IA (3.5.1) o planificado desde una idea (3.5.2) — permitirle llevar un registro vivo del avance, documentar sus experiencias y, opcionalmente, compartirlo con otros usuarios de la plataforma.

#### 3.6.1 Tipo y Ciclo de Vida del Proyecto

Al crear o guardar un proyecto, el usuario declara su **tipo**, que determina el nivel de detalle técnico esperado y los defaults de visibilidad:

| Tipo | Descripción | Visibilidad por defecto |
| :--- | :--- | :--- |
| **DIY** | Proyecto personal o de hobby; código simple (Arduino, ESPHome, MicroPython). | Pública si el usuario lo publica |
| **Prototipo** | Funcional pero no optimizado; punto intermedio entre exploración y producción. | Pública si el usuario lo publica |
| **Profesional** | Orientado a producción: C/C++/Rust, eficiencia energética, manejo robusto de errores, código modular. | **Privada por defecto**; el usuario debe habilitarla explícitamente |

Un proyecto activo atraviesa los siguientes estados:

```
Guardado → En curso → Pausado → Completado
                              ↘ Abandonado
```

| Estado | Descripción |
| :--- | :--- |
| **Guardado** | El proyecto fue seleccionado desde 3.5.1 / 3.5.2 pero aún no se comenzó. |
| **En curso** | El usuario inició el proyecto activamente. |
| **Pausado** | Trabajo interrumpido temporalmente; conserva todo el historial. |
| **Completado** | El proyecto fue terminado. Candidato para publicar en la comunidad. |
| **Abandonado** | Se descartó; el historial queda disponible para referencia. |

#### 3.6.2 Bitácora de Avance

El usuario puede registrar entradas de bitácora en cualquier momento del ciclo de vida. Cada entrada contiene:

- **Fecha y hora** — registradas automáticamente.
- **Texto libre** — descripción de lo realizado, problemas encontrados, decisiones tomadas.
- **Imágenes adjuntas** — fotos del progreso físico del proyecto (protoboard, cableado, armado final).
- **Etiquetas de estado** — el usuario puede marcar la entrada como: `avance`, `problema`, `solución`, `aprendizaje`, `código`.
- **Recurso de código** (opcional) — una entrada de tipo `código` puede incluir un bloque de código fuente con su lenguaje y entorno de destino (ver módulo 3.7). El usuario decide si adjunta código; no es obligatorio en ningún tipo de proyecto.

El conjunto de entradas forma una línea de tiempo cronológica del proyecto.

**Criterios de aceptación (3.6.1 Ciclo de vida):**

- **AC-3.6.1**: El usuario crea un proyecto manual con título, tipo (DIY/Prototipo/Profesional) y dificultad → aparece en la lista en estado "Guardado".
- **AC-3.6.2**: El usuario cambia el estado del proyecto siguiendo las transiciones válidas: Guardado → En curso → Pausado/Completado/Abandonado. Las transiciones inválidas no están disponibles.
- **AC-3.6.3**: El usuario edita título y descripción del proyecto inline → los cambios persisten al recargar.

**Criterios de aceptación (3.6.2 Bitácora):**

- **AC-3.6.4**: El usuario añade una entrada de bitácora con contenido de texto y etiqueta (avance/problema/solución/aprendizaje/código) → aparece en la línea de tiempo del proyecto ordenada cronológicamente.
- **AC-3.6.5**: El usuario marca una entrada como pública → queda disponible si el proyecto se publica.

**Criterios de aceptación (3.6 BOM):**

- **AC-3.6.6**: El usuario agrega un componente a la BOM del proyecto con nombre y cantidad → aparece en la tabla de materiales.
- **AC-3.6.7**: El usuario edita la cantidad de un item de BOM → el cambio persiste.
- **AC-3.6.8**: El usuario elimina un item de BOM → desaparece de la tabla.

#### 3.6.3 Control de Componentes Consumidos

Durante la ejecución del proyecto el usuario puede marcar componentes de la BOM como utilizados. Esto descuenta automáticamente las unidades del inventario personal, manteniendo el stock sincronizado con el trabajo físico real.

- Si la cantidad disponible cae a cero o a un nivel insuficiente, la aplicación muestra una alerta en la vista del proyecto.
- El usuario puede revertir el descuento si cometió un error.

**Criterios de aceptación (3.6.3 Consumo):**

- **AC-3.6.9**: El usuario marca un componente de la BOM como utilizado → la cantidad se descuenta del stock del inventario personal.
- **AC-3.6.10**: Si el componente no está en inventario → se muestra badge "Falta" y el botón de consumo está deshabilitado.
- **AC-3.6.11**: El usuario revierte un consumo → la cantidad se restaura en el stock.

#### 3.6.4 Publicación y Comunidad

Cuando el usuario considera que su proyecto tiene valor para compartir puede publicarlo. Un proyecto publicado se vuelve visible para todos los usuarios de la plataforma.

**Contenido del proyecto publicado:**

| Elemento | Descripción |
| :--- | :--- |
| **Título y descripción** | Editables antes de publicar; independientes del nombre interno. |
| **BOM pública** | Lista de componentes usados, sin exponer datos de stock privado. |
| **Bitácora seleccionada** | El usuario elige qué entradas de la bitácora incluir en la versión pública. |
| **Galería de imágenes** | Fotos del proceso y resultado final seleccionadas por el usuario. |
| **Nivel de dificultad** | Autoevaluado por el autor (Principiante / Intermedio / Avanzado). |
| **Etiquetas** | Categorías libres para facilitar el descubrimiento (ej. `WiFi`, `sensor`, `automatización`). |

**Interacciones sociales:**

- **Me gusta y Fork** — dar "Me gusta" a un proyecto ajeno y guardarlo son una sola acción: al presionar el botón el proyecto queda en la lista personal del usuario (estado `Guardado`) listo para ejecutarse. Esto es equivalente a un fork: se crea una instancia propia a partir del proyecto original, sin copiar la bitácora.
- **Contador de forks con dos niveles** — cada proyecto publicado muestra:
  - `Forks directos` — usuarios que forkearon específicamente este proyecto.
  - `Forks en el árbol` — total acumulado de forks en toda la genealogía descendiente (forks de forks incluidos). Este número refleja el impacto real de la idea original sin atribuirle al autor crédito por el trabajo de quienes la evolucionaron.
- **Trazabilidad de origen** — cada fork registra únicamente su padre directo. La cadena completa de origen es navegable proyecto a proyecto (ej. `C → B → A`), pero C aparece listado solo como fork directo de B, no de A.
- **Comentarios** — hilo de comentarios por proyecto para preguntas y retroalimentación entre usuarios.

**Consideraciones de privacidad:**
- La publicación es siempre una acción explícita del usuario; ningún proyecto se comparte sin su consentimiento.
- Los datos de inventario personal (cantidades, ubicaciones) nunca son visibles en la versión pública.
- El usuario puede despublicar un proyecto en cualquier momento; los comentarios existentes se eliminan junto con él.

**Criterios de aceptación (3.6.4 Publicación y Comunidad):**

- **AC-3.6.12**: El usuario publica un proyecto completado → el proyecto aparece en el feed de la comunidad con título, descripción, BOM pública, dificultad y tags.
- **AC-3.6.13**: El usuario selecciona qué entradas de bitácora incluir en la versión pública antes de publicar.
- **AC-3.6.14**: Un usuario hace fork de un proyecto público → se crea una copia en su lista personal en estado "Guardado" con la BOM pero sin la bitácora. El contador de forks directos del proyecto original se incrementa.
- **AC-3.6.15**: Un usuario comenta en un proyecto público → el comentario aparece en el hilo del proyecto.
- **AC-3.6.16**: El autor despublica su proyecto → desaparece del feed de la comunidad.
- **AC-3.6.17**: Los datos de inventario personal (cantidades, ubicaciones) nunca son visibles en la versión pública del proyecto.

---

### 3.7 Generación y Análisis de Código

**Objetivo:** Asistir al usuario en la producción de firmware o código de control para sus proyectos, adaptando el estilo y la complejidad al tipo de proyecto declarado (módulo 3.6.1).

#### 3.7.1 Generación de código desde el proyecto

A partir de la BOM y la descripción del proyecto, la IA puede generar código listo para cargar en el controlador objetivo.

**Entornos soportados por tipo de proyecto:**

| Tipo | Entornos sugeridos |
| :--- | :--- |
| **DIY** | Arduino IDE (`.ino`), ESPHome (YAML), MicroPython |
| **Prototipo** | Arduino IDE, PlatformIO (C++) |
| **Profesional** | PlatformIO (C/C++), ESP-IDF (C/C++), Zephyr (C), Rust (`embassy`, `esp-hal`) |

- La app sugiere el entorno más adecuado según el tipo y los componentes; el usuario puede sobreescribir la selección.
- El usuario puede solicitar un **esqueleto** (estructura base con comentarios) o **código completo** funcional.
- El código generado se adjunta opcionalmente como entrada de tipo `código` en la bitácora del proyecto.

#### 3.7.2 Análisis y mejora de código existente

El usuario puede pegar o subir código propio desde la bitácora de un proyecto activo y solicitar a la IA que lo analice.

La respuesta incluye:
1. **Explicación detallada** de cada mejora o cambio sugerido, con el razonamiento técnico.
2. **Código mejorado** con los cambios aplicados.
3. **Opción de descarga** del código mejorado como archivo (`.ino`, `.cpp`, `.py`, `.yaml`, etc.).

El análisis puede incluir: refactorización, detección de bugs potenciales, optimización de memoria/energía (especialmente relevante en tipo Profesional) y mejoras de estilo.

> **Roadmap:** El análisis de código standalone (fuera del contexto de un proyecto) es una funcionalidad planificada para una fase posterior.

**Criterios de aceptación (3.7.1 Generación):**

- **AC-3.7.1**: El usuario solicita generar código desde un proyecto → selecciona entorno de destino → la IA genera código funcional o esqueleto según la selección.
- **AC-3.7.2**: El código generado puede descargarse como archivo con la extensión correcta según el entorno (.ino, .cpp, .py, .yaml).
- **AC-3.7.3**: El entorno sugerido por defecto corresponde al tipo de proyecto (DIY → Arduino IDE, Profesional → PlatformIO/ESP-IDF).

**Criterios de aceptación (3.7.2 Análisis):**

- **AC-3.7.4**: El usuario envía código existente para análisis → la IA retorna mejoras sugeridas con explicación y código mejorado.
- **AC-3.7.5**: Cada mejora indica su tipo (rendimiento, bug potencial, estilo) para que el usuario pueda priorizar.

---

## 4. Requisitos No Funcionales

| Categoría | Requisito |
| :--- | :--- |
| **Multi-usuario** | Cada usuario ve y gestiona únicamente su propio inventario (RLS en PostgreSQL). |
| **PWA** | Instalable en móvil y desktop; flujo de cámara nativo en móvil. |
| **Rendimiento** | El reconocimiento por IA debe responder en < 10 s en condiciones normales de red. |
| **Seguridad** | Autenticación vía Supabase Auth (OAuth + magic link). Todas las rutas de API requieren token válido. |
| **Privacidad** | Las imágenes de componentes se almacenan en el bucket privado del usuario en Supabase Storage. |
| **Offline parcial** | El inventario en modo lectura debe funcionar sin conexión mediante caché de Service Worker. |

### 4.1 Flujo de Autenticación

1. El usuario accede a cualquier ruta protegida (`/inventory`, `/projects`, `/locations`, `/community`, `/ai/*`).
2. El middleware de Astro verifica la sesión via `supabase.auth.getUser()`. Si no hay sesión válida, redirige a `/auth/login`.
3. La página de login ofrece tres opciones:
   - **OAuth con Google** — redirect flow via Supabase Auth.
   - **OAuth con GitHub** — redirect flow via Supabase Auth.
   - **Magic link por email** — el usuario ingresa su email, Supabase envía un link de un solo uso.
4. Post-login, Supabase Auth emite un JWT que se almacena como cookie HTTP-only.
5. El middleware de Astro inyecta el `user_id` del JWT en cada request server-side; las políticas RLS de PostgreSQL filtran los datos automáticamente.
6. **Onboarding post-registro:** en el primer login, la app redirige a `/inventory` con un empty state que guía al usuario a registrar su primer componente.
7. **Logout:** el usuario puede cerrar sesión desde cualquier página; se invalida la cookie y se redirige a `/auth/login`.

### 4.2 Estrategia del Catálogo Maestro

El catálogo maestro (`components`) es la base compartida de specs técnicas. Se puebla mediante dos mecanismos:

- **Seed inicial:** un dataset curado de ~200 componentes populares (ESP32 variants, Arduino boards, sensores comunes) cargado via migración SQL.
- **Enriquecimiento por uso:** cada vez que un usuario confirma un alta via scan IA, si el componente no existe en el catálogo maestro, se crea una entrada nueva. Esto convierte a cada usuario en contribuidor implícito del catálogo.
- **Deduplicación:** antes de crear una entrada nueva, el sistema busca coincidencias por nombre normalizado. Si hay match parcial (>80% similitud), sugiere vincular al componente existente en vez de crear uno nuevo.

**Criterios de aceptación:**

- **AC-4.1**: Las rutas protegidas (/inventory, /projects, /locations) redirigen a /login si el usuario no está autenticado.
- **AC-4.2**: Un usuario autenticado no puede ver ni modificar datos de otro usuario (RLS enforced).
- **AC-4.3**: La página de login ofrece OAuth (Google, GitHub) y magic link por email.
- **AC-4.4**: El reconocimiento por IA responde en menos de 10 segundos en condiciones normales.
- **AC-4.5**: En el primer login, el usuario ve un empty state con call-to-action para registrar su primer componente.
- **AC-4.6**: Al confirmar un scan IA de un componente no catalogado, se crea una entrada en el catálogo maestro compartido.

### 4.3 Estándares de Desarrollo

El proyecto sigue tres principios de ingeniería que aplican a toda contribución (humana o asistida por IA):

#### TDD Estricto (Test-Driven Development)

Todo código nuevo sigue el ciclo Red → Green → Refactor sin excepciones:

1. **Red** — Escribir un test que falle y que describa el comportamiento esperado.
2. **Green** — Escribir el código MÍNIMO necesario para que el test pase.
3. **Refactor** — Limpiar sin cambiar comportamiento; los tests deben seguir pasando.

Aplica a: features nuevas, bug fixes, refactors. No se mergea código sin tests que lo respalden. Los tests son la especificación ejecutable del sistema.

- **Unit tests**: Vitest — lógica de negocio, utilidades, stores.
- **Component tests**: Testing Library — islands React (interacción, renderizado).
- **E2E tests**: Playwright — flujos completos de usuario.

#### SOLID (enfoque selectivo)

Se priorizan dos principios por su impacto directo en la arquitectura de islands:

- **Single Responsibility (SRP)** — Cada componente, función o módulo tiene UNA razón para cambiar. Un island no mezcla fetching, lógica de negocio y presentación. Si un archivo hace dos cosas, se separa.
- **Dependency Inversion (DIP)** — Los módulos de alto nivel (islands, pages) no dependen de implementaciones concretas (Supabase client, fetch directo). Dependen de abstracciones (funciones en `src/lib/`). Esto permite testear islands sin necesitar Supabase real y cambiar proveedores sin reescribir componentes.

Los demás principios SOLID (Open/Closed, Liskov, Interface Segregation) se aplican cuando el contexto lo justifica, no como regla universal.

#### KISS (Keep It Simple)

- La solución más simple que funciona es la correcta. No se agregan abstracciones, helpers o capas de indirección hasta que haya una necesidad concreta y demostrada.
- Tres líneas de código similares son preferibles a una abstracción prematura.
- No se diseña para requisitos hipotéticos futuros.

---

## 5. Fuera de Alcance (v1)

- Integración con tiendas o proveedores para compra directa o estimación de costos de componentes faltantes (fase posterior).
- Gestión de proyectos colaborativos (inventario compartido entre usuarios en tiempo real).
- Telemetría en tiempo real de dispositivos IoT (reservado para fase 2).
- Control de versiones de esquemáticos o código de firmware.
- Análisis de código standalone fuera del contexto de un proyecto (fase posterior).
- Soporte completo de Raspberry Pi como plataforma de destino — implica lógica distinta (SBC Linux, Python/Node, GPIO diferente, rol hub vs nodo IoT). La arquitectura incluye el campo `platform_family` desde v1 para no bloquear esta extensión futura.

---

## 5b. Supuestos

| # | Supuesto | Impacto si es falso |
| :--- | :--- | :--- |
| S1 | El usuario tiene conectividad a internet al escanear componentes con la cámara | El flujo de scan IA no funciona offline; el alta manual sí |
| S2 | Los componentes electrónicos comunes son visualmente distinguibles por un modelo de visión | Si la precisión es < 50%, el módulo de scan pierde valor y se convierte en fricción |
| S3 | El catálogo maestro compartido no requiere moderación en v1 | Entradas duplicadas o incorrectas pueden degradar la calidad; monitorear post-launch |
| S4 | Los makers están dispuestos a registrar componentes uno a uno | Si la barrera de entrada es muy alta, considerar alta masiva (CSV import) |
| S5 | Supabase Storage es suficiente para imágenes de componentes en v1 | Latencia y límites de almacenamiento gratuito pueden ser un cuello de botella |
| S6 | Los usuarios interactúan principalmente desde móvil (cámara, QR) | Si el uso es mayoritariamente desktop, repensar la prioridad de PWA y flujos de cámara |

---

## 5c. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
| :--- | :--- | :--- | :--- | :--- |
| R1 | La IA identifica mal >40% de los componentes | Media | Alto — destruye confianza en la feature principal de diferenciación | Lanzar con scan como "beta". Medir precisión real. Si < 60%, priorizar mejora de prompts/modelo antes de push de adopción. Alta manual siempre disponible como fallback. |
| R2 | Latencia de Supabase Storage inaceptable en móvil para subir fotos | Baja | Medio — degrada UX del flujo de scan | Comprimir imágenes client-side antes de upload. Medir p95 en beta. Evaluar CDN si es necesario. |
| R3 | Barrera de entrada alta: registrar 50+ componentes uno a uno es tedioso | Alta | Alto — abandono en onboarding | Planificar import CSV como feature Should Have. Priorizar scan IA como acelerador de alta. |
| R4 | RLS mal configurado expone datos entre usuarios | Baja | Crítico — breach de privacidad | Tests automatizados de RLS en CI. Auditoría manual pre-launch. Zero tolerance: cualquier leak es P0. |
| R5 | Costos de API de IA escalan con adopción | Media | Medio — márgenes negativos si el scan es muy popular | Implementar rate limiting por usuario (N scans/día en plan free). Monitorear costo por scan. Cachear resultados para componentes ya identificados. |
| R6 | Comunidad vacía al lanzamiento: nadie publica ni forkea | Alta | Bajo (v1) — la comunidad es Could Have | No lanzar comunidad hasta tener base de proyectos. Considerar seed con proyectos de ejemplo del equipo. |

---

## 6. Dependencias Técnicas

| Componente | Tecnología |
| :--- | :--- |
| Frontend | Astro 6 + React 19 (Islands) |
| Autenticación | Supabase Auth |
| Base de datos | PostgreSQL 16 (Supabase) + RLS |
| Series temporales | TimescaleDB (fase 2) |
| API de IA | FastAPI + modelo de visión (Claude / GPT-4o) |
| Almacenamiento de imágenes | Supabase Storage |
| Despliegue | Vercel (frontend) + Supabase Cloud (datos) |

---

## 7. Roadmap Comercial y Estrategia de Plataformas

### 7.1 Fases de producto

| Fase | Objetivo | Plataforma | Criterio de salida |
| :--- | :--- | :--- | :--- |
| **v1 — MVP** | Validar que el producto resuelve un problema real | PWA (web + móvil) | 50+ usuarios activos con retención semanal > 40 % |
| **v2 — Crecimiento** | Iterar sobre feedback real y crecer base de usuarios | PWA + mejoras de UX móvil | > 60 % del tráfico desde móvil con fricción documentada |
| **v3 — Comercial** | Monetizar y escalar | Apps nativas (si se justifica) | Ver criterios en sección 8.2 |

### 7.2 ¿Cuándo vale el esfuerzo de crear apps nativas?

Las apps nativas (iOS y Android) implican mantener un codebase adicional, ciclos de review en App Store / Google Play y costos de distribución. El esfuerzo se justifica **únicamente** si se cumple al menos uno de estos criterios:

| Criterio | Señal concreta que lo activa |
| :--- | :--- |
| **Canal de adquisición** | El descubrimiento orgánico en App Store / Google Play es una fuente relevante de nuevos usuarios y la PWA no aparece en esos resultados. |
| **Capacidades de hardware** | Se requiere Bluetooth BLE para conectar directamente con dispositivos IoT, o procesamiento de imagen offline (inferencia local con Core ML / ML Kit) sin depender de la API. |
| **Fricción documentada en móvil** | Las métricas o entrevistas de usuarios muestran que la experiencia PWA en móvil es un bloqueador real de adopción o retención. |
| **Requisito de cliente enterprise** | Un cliente B2B exige distribución via MDM corporativo o presencia en tienda como condición de contrato. |

Mientras ninguno de estos criterios esté activo, la PWA cubre el 90 % del caso de uso (cámara, QR, instalación en home screen) con un único codebase y sin fricción de distribución.

### 7.3 Ruta técnica si se llega a apps nativas

Si los criterios anteriores se activan, la ruta recomendada es **React Native con Expo**, no apps nativas puras (Swift / Kotlin). Esto permite:

- Reutilizar los componentes React ya construidos en la PWA.
- Mantener un único codebase para iOS, Android y web.
- Acceder a APIs de hardware (BLE, cámara avanzada, notificaciones push) sin abandonar el ecosistema JavaScript/TypeScript.
- Reducir el tiempo de go-to-market nativo en ~50 % respecto a dos codebases separados.

---

## 8. Glosario

| Término | Definición |
| :--- | :--- |
| **Componente** | Pieza electrónica individual catalogada en el inventario (ej. resistencia, microcontrolador). |
| **Ubicación** | Contenedor físico donde se almacenan componentes (mueble, cajón, maleta, caja). |
| **BOM** | *Bill of Materials* — lista de materiales necesarios para construir un proyecto. |
| **RLS** | *Row Level Security* — política de PostgreSQL que restringe el acceso a filas por usuario. |
| **QR** | Código de respuesta rápida imprimible que vincula una ubicación física con la aplicación. |
| **Hypertable** | Tabla optimizada de TimescaleDB para almacenar series temporales de alta frecuencia. |
| **platform_family** | Familia de plataforma de un componente: `esp32`, `arduino`, `rpi`, `generic`. Determina el ecosistema de herramientas y lenguajes de programación aplicables. |
| **connectivity_caps** | Capacidades de conectividad detectadas en un componente (WiFi, BLE, LoRa, Zigbee, Thread, Ethernet). Usadas para validar compatibilidad con los requisitos de un proyecto. |
| **Tipo de proyecto** | Nivel de complejidad declarado al crear un proyecto: DIY (hobby/simple), Prototipo (funcional no optimizado) o Profesional (producción, C/C++/Rust). Determina defaults de código, entorno y visibilidad. |
| **Incompatible** | Estado de un componente de la BOM que está en inventario pero no cumple un requisito del proyecto (ej. falta WiFi). Se distingue de "Faltante" porque la pieza existe físicamente. |
| **Refinamiento guiado** | Segunda etapa del flujo de planificación (3.5.2) donde el usuario ajusta la propuesta inicial de la IA mediante controles estructurados: controlador preferido, dificultad y restricciones. |
