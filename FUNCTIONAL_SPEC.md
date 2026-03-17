# Especificación Funcional — IoT Assistant

**Versión:** 0.2
**Fecha:** 2026-03-17
**Estado:** Borrador

---

## 1. Visión del Producto

IoT Assistant es una aplicación web progresiva (PWA) orientada a makers, estudiantes y profesionales de electrónica que necesitan gestionar su inventario de componentes de manera eficiente. A través de reconocimiento visual por IA, organización física con códigos QR e inteligencia de proyectos, la aplicación transforma una colección desordenada de piezas en un activo consultable y accionable.

---

## 2. Usuarios Objetivo

| Perfil | Descripción |
| :--- | :--- |
| **Maker / Hobbyist** | Acumula componentes de distintas fuentes y necesita saber qué tiene y dónde está. |
| **Estudiante de electrónica** | Gestiona un kit de laboratorio y quiere explorar proyectos con sus piezas actuales. |
| **Profesional / Freelancer** | Requiere trazabilidad de stock para cotizar proyectos y evitar compras duplicadas. |

---

## 3. Módulos Funcionales

### 3.1 Gestión de Inventario

**Objetivo:** Mantener un registro preciso y actualizado de todos los componentes electrónicos que el usuario posee.

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

---

### 3.2 Reconocimiento de Componentes por IA

**Objetivo:** Reducir la fricción del alta de inventario permitiendo que el usuario fotografíe una pieza y el sistema la identifique automáticamente, extrayendo además sus capacidades técnicas y de conectividad.

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

---

### 3.3 Gestión de Ubicaciones Físicas

**Objetivo:** Permitir al usuario organizar sus componentes en una jerarquía de ubicaciones físicas (habitación → mueble / maleta → cajón / compartimento) y localizar piezas rápidamente.

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

---

### 3.5 Inteligencia de Proyectos

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

#### 3.6.3 Control de Componentes Consumidos

Durante la ejecución del proyecto el usuario puede marcar componentes de la BOM como utilizados. Esto descuenta automáticamente las unidades del inventario personal, manteniendo el stock sincronizado con el trabajo físico real.

- Si la cantidad disponible cae a cero o a un nivel insuficiente, la aplicación muestra una alerta en la vista del proyecto.
- El usuario puede revertir el descuento si cometió un error.

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

---

## 5. Fuera de Alcance (v1)

- Integración con tiendas o proveedores para compra directa o estimación de costos de componentes faltantes (fase posterior).
- Gestión de proyectos colaborativos (inventario compartido entre usuarios en tiempo real).
- Telemetría en tiempo real de dispositivos IoT (reservado para fase 2).
- Control de versiones de esquemáticos o código de firmware.
- Análisis de código standalone fuera del contexto de un proyecto (fase posterior).
- Soporte completo de Raspberry Pi como plataforma de destino — implica lógica distinta (SBC Linux, Python/Node, GPIO diferente, rol hub vs nodo IoT). La arquitectura incluye el campo `platform_family` desde v1 para no bloquear esta extensión futura.

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

## 8. Roadmap Comercial y Estrategia de Plataformas

### 8.1 Fases de producto

| Fase | Objetivo | Plataforma | Criterio de salida |
| :--- | :--- | :--- | :--- |
| **v1 — MVP** | Validar que el producto resuelve un problema real | PWA (web + móvil) | 50+ usuarios activos con retención semanal > 40 % |
| **v2 — Crecimiento** | Iterar sobre feedback real y crecer base de usuarios | PWA + mejoras de UX móvil | > 60 % del tráfico desde móvil con fricción documentada |
| **v3 — Comercial** | Monetizar y escalar | Apps nativas (si se justifica) | Ver criterios en sección 8.2 |

### 8.2 ¿Cuándo vale el esfuerzo de crear apps nativas?

Las apps nativas (iOS y Android) implican mantener un codebase adicional, ciclos de review en App Store / Google Play y costos de distribución. El esfuerzo se justifica **únicamente** si se cumple al menos uno de estos criterios:

| Criterio | Señal concreta que lo activa |
| :--- | :--- |
| **Canal de adquisición** | El descubrimiento orgánico en App Store / Google Play es una fuente relevante de nuevos usuarios y la PWA no aparece en esos resultados. |
| **Capacidades de hardware** | Se requiere Bluetooth BLE para conectar directamente con dispositivos IoT, o procesamiento de imagen offline (inferencia local con Core ML / ML Kit) sin depender de la API. |
| **Fricción documentada en móvil** | Las métricas o entrevistas de usuarios muestran que la experiencia PWA en móvil es un bloqueador real de adopción o retención. |
| **Requisito de cliente enterprise** | Un cliente B2B exige distribución via MDM corporativo o presencia en tienda como condición de contrato. |

Mientras ninguno de estos criterios esté activo, la PWA cubre el 90 % del caso de uso (cámara, QR, instalación en home screen) con un único codebase y sin fricción de distribución.

### 8.3 Ruta técnica si se llega a apps nativas

Si los criterios anteriores se activan, la ruta recomendada es **React Native con Expo**, no apps nativas puras (Swift / Kotlin). Esto permite:

- Reutilizar los componentes React ya construidos en la PWA.
- Mantener un único codebase para iOS, Android y web.
- Acceder a APIs de hardware (BLE, cámara avanzada, notificaciones push) sin abandonar el ecosistema JavaScript/TypeScript.
- Reducir el tiempo de go-to-market nativo en ~50 % respecto a dos codebases separados.

---

## 7. Glosario

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
