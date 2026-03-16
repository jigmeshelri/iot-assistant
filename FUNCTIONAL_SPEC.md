# Especificación Funcional — IoT Assistant

**Versión:** 0.1
**Fecha:** 2026-03-16
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
- **Vista de detalle** — ficha completa del componente: imagen, datasheet vinculado, especificaciones normalizadas, cantidad disponible e historial de movimientos.

**Datos por componente:**

| Campo | Tipo | Notas |
| :--- | :--- | :--- |
| `sku` | `TEXT` | Identificador único interno (ej. `MCU-001`) |
| `name` | `TEXT` | Nombre técnico (ej. "ESP32-C6 XIAO") |
| `category` | `ENUM` | Microcontrolador, Sensor, Actuador, Alimentación, Módulo, Pasivo |
| `quantity` | `INTEGER` | Unidades disponibles ≥ 0 |
| `technical_specs` | `JSONB` | Specs flexibles: voltaje, corriente, protocolo, etc. |
| `image_url` | `TEXT` | Foto tomada por el usuario |
| `datasheet_url` | `TEXT` | Enlace al datasheet oficial |
| `location_id` | `UUID` | FK a la ubicación física (módulo 3.3) |

---

### 3.2 Reconocimiento de Componentes por IA

**Objetivo:** Reducir la fricción del alta de inventario permitiendo que el usuario fotografíe una pieza y el sistema la identifique automáticamente.

**Flujo:**

1. El usuario abre el flujo de alta y selecciona la opción **"Escanear con cámara"**.
2. La aplicación captura o permite subir una imagen del componente.
3. La imagen se envía al microservicio FastAPI, que consulta un modelo de visión (ej. Claude Vision / GPT-4o).
4. El modelo retorna:
   - Nombre probable del componente
   - Categoría sugerida
   - Especificaciones técnicas inferidas (voltaje de operación, interfaz, encapsulado)
   - Enlace o referencia al datasheet cuando sea identificable
5. El sistema presenta los datos al usuario en un formulario pre-rellenado para **revisión y confirmación** antes de guardar.
6. El usuario puede corregir cualquier campo antes de confirmar el alta.

**Consideraciones:**
- El resultado de la IA es una sugerencia, nunca se guarda sin confirmación del usuario.
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
2. La aplicación envía el inventario actual (lista de componentes, categorías y specs) al modelo de IA.
3. El modelo sugiere proyectos ordenados por viabilidad (porcentaje de piezas disponibles).
4. Cada sugerencia incluye:
   - Título y descripción breve del proyecto.
   - Lista de componentes requeridos, marcando cuáles están disponibles en inventario.
   - Nivel de dificultad estimado.
   - Recursos externos opcionales (tutoriales, esquemáticos).

#### 3.5.2 Planificación: "Quiero construir X, ¿qué necesito?"

**Flujo:**

1. El usuario describe el proyecto en lenguaje natural (ej. "estación meteorológica con WiFi y pantalla OLED").
2. La IA genera la lista de materiales (BOM — Bill of Materials) requerida.
3. El sistema cruza la BOM con el inventario del usuario y clasifica cada ítem:

| Estado | Descripción |
| :--- | :--- |
| **Disponible** | El usuario tiene cantidad suficiente en inventario. |
| **Parcial** | Tiene el componente pero en cantidad insuficiente. |
| **Faltante** | No está en inventario; debe adquirirse. |

4. La aplicación presenta un resumen de adquisición: lista de piezas faltantes o parciales lista para compartir o exportar.

**Consideraciones comunes a 3.5.1 y 3.5.2:**
- Las sugerencias de la IA son orientativas; el usuario puede guardar, descartar o compartir los resultados.
- El módulo no gestiona compras ni se integra con tiendas en esta versión.
- El historial de proyectos explorados se guarda opcionalmente para referencia futura.

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

- Integración con tiendas o proveedores para compra directa de componentes faltantes.
- Gestión de proyectos colaborativos (inventario compartido entre usuarios).
- Telemetría en tiempo real de dispositivos IoT (reservado para fase 2).
- Control de versiones de esquemáticos o código de firmware.

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

## 7. Glosario

| Término | Definición |
| :--- | :--- |
| **Componente** | Pieza electrónica individual catalogada en el inventario (ej. resistencia, microcontrolador). |
| **Ubicación** | Contenedor físico donde se almacenan componentes (mueble, cajón, maleta, caja). |
| **BOM** | *Bill of Materials* — lista de materiales necesarios para construir un proyecto. |
| **RLS** | *Row Level Security* — política de PostgreSQL que restringe el acceso a filas por usuario. |
| **QR** | Código de respuesta rápida imprimible que vincula una ubicación física con la aplicación. |
| **Hypertable** | Tabla optimizada de TimescaleDB para almacenar series temporales de alta frecuencia. |
