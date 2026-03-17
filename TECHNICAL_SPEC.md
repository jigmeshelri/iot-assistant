# Especificación Técnica — IoT Assistant

**Versión:** 0.2
**Fecha:** 2026-03-17
**Estado:** Borrador
**Referencia:** [FUNCTIONAL_SPEC.md](./FUNCTIONAL_SPEC.md)

---

## 1. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (PWA)                        │
│              Astro 6 (SSG) + React 19 Islands               │
│         Service Worker (Workbox) — cache offline            │
└───────────────┬─────────────────────────┬───────────────────┘
                │ HTTPS / REST            │ HTTPS
                ▼                         ▼
┌──────────────────────┐     ┌────────────────────────────────┐
│   FastAPI (Python)   │     │         Supabase Cloud         │
│   Microservicio IA   │     │  ┌─────────────────────────┐   │
│  • Reconocimiento    │     │  │  PostgreSQL 16 + RLS     │   │
│  • Inteligencia de   │     │  │  TimescaleDB (fase 2)    │   │
│    proyectos         │     │  └─────────────────────────┘   │
│  • Generación QR     │     │  ┌─────────────────────────┐   │
└──────────┬───────────┘     │  │   Supabase Auth         │   │
           │                 │  │   (JWT / OAuth)          │   │
           │ SDK             │  └─────────────────────────┘   │
           ▼                 │  ┌─────────────────────────┐   │
┌──────────────────────┐     │  │   Supabase Storage      │   │
│  Modelo de Visión IA │     │  │   (imágenes privadas)   │   │
│  Claude Vision /     │     │  └─────────────────────────┘   │
│  GPT-4o              │     └────────────────────────────────┘
└──────────────────────┘
```

### Principios de diseño

- **Supabase como BFF** — el cliente consulta Supabase directamente para CRUD de inventario, stock, ubicaciones y proyectos. El JWT de Supabase Auth actúa como token de autorización en todas las rutas.
- **FastAPI solo para lógica IA** — el microservicio no gestiona datos propios; recibe el contexto necesario del cliente, llama al modelo externo y devuelve el resultado.
- **RLS como única fuente de verdad de autorización** — ninguna capa de aplicación filtra datos por usuario; las políticas de PostgreSQL lo garantizan estructuralmente.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| Frontend framework | Astro | 6.x |
| UI interactivo | React | 19.x |
| Lenguaje frontend | TypeScript | 5.x |
| CSS | Tailwind CSS | 4.x |
| PWA / Service Worker | `@vite-pwa/astro` + Workbox | latest |
| Base de datos | PostgreSQL (Supabase Cloud) | 16 |
| Auth | Supabase Auth | — |
| Storage | Supabase Storage | — |
| Cliente Supabase | `@supabase/supabase-js` | 2.x |
| API IA | FastAPI | 0.115.x |
| Runtime API | Python | 3.12 |
| Modelo de visión | Claude Vision (`claude-opus-4-6`) | — |
| Contenedor local | Docker + Docker Compose | — |
| Despliegue frontend | Vercel | — |
| Despliegue API | Railway / Fly.io | — |

---

## 3. Esquema de Base de Datos

### 3.1 Diagrama de entidades

```
auth.users (Supabase managed)
    │
    ├──< locations (árbol auto-referenciado)
    │       └──< stock
    │               └──> components (catálogo compartido)
    │
    ├──< projects
    │       ├──< project_bom ──> components
    │       ├──< project_log_entries
    │       │       └──< project_log_images
    │       ├──< project_consumed_stock ──> stock
    │       └──< project_comments
    │
    └── (self-referencia fork) projects.parent_project_id ──> projects
```

### 3.2 Tablas

#### `components` — Catálogo maestro compartido

```sql
CREATE TYPE platform_family AS ENUM ('esp32', 'arduino', 'rpi', 'generic');

CREATE TABLE components (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku               TEXT UNIQUE NOT NULL,
    name              TEXT NOT NULL,
    category          TEXT NOT NULL CHECK (category IN (
                          'Microcontrolador','Sensor','Alimentación',
                          'Actuador','Módulo','Pasivo'
                      )),
    platform_family   platform_family NOT NULL DEFAULT 'generic',
    connectivity_caps JSONB NOT NULL DEFAULT '{}',
    -- Ejemplo: {"wifi": "802.11ax", "ble": "5.0", "lora": false, "zigbee": false}
    technical_specs   JSONB NOT NULL DEFAULT '{}',
    datasheet_url     TEXT,
    image_url         TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_components_specs        ON components USING GIN (technical_specs);
CREATE INDEX idx_components_connectivity ON components USING GIN (connectivity_caps);
CREATE INDEX idx_components_name         ON components USING GIN (to_tsvector('spanish', name));
CREATE INDEX idx_components_platform     ON components(platform_family);
```

#### `locations` — Jerarquía física de ubicaciones

```sql
CREATE TABLE locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES locations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    qr_code     TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_locations_user   ON locations(user_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);
```

> `qr_code` es inmutable: nunca debe actualizarse una vez generado.

#### `stock` — Inventario privado del usuario

```sql
CREATE TABLE stock (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    component_id    UUID NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
    location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    notes           TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_user      ON stock(user_id);
CREATE INDEX idx_stock_component ON stock(component_id);
```

#### `projects` — Proyectos del usuario

```sql
CREATE TYPE project_status AS ENUM
    ('saved', 'in_progress', 'paused', 'completed', 'abandoned');

CREATE TYPE project_source AS ENUM
    ('ai_discovery', 'ai_planning', 'fork', 'manual');

CREATE TYPE project_difficulty AS ENUM
    ('beginner', 'intermediate', 'advanced');

CREATE TYPE project_type AS ENUM
    ('diy', 'prototype', 'professional');

CREATE TABLE projects (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_project_id   UUID REFERENCES projects(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    description         TEXT,
    status              project_status NOT NULL DEFAULT 'saved',
    source              project_source NOT NULL DEFAULT 'manual',
    project_type        project_type NOT NULL DEFAULT 'diy',
    -- is_public: proyectos 'professional' son privados por defecto (FALSE).
    -- DIY y Prototype también inician en FALSE; el usuario publica explícitamente.
    is_public           BOOLEAN NOT NULL DEFAULT FALSE,
    difficulty          project_difficulty,
    tags                TEXT[] NOT NULL DEFAULT '{}',
    direct_fork_count   INTEGER NOT NULL DEFAULT 0,  -- mantenido por trigger
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_user       ON projects(user_id);
CREATE INDEX idx_projects_parent     ON projects(parent_project_id);
CREATE INDEX idx_projects_public     ON projects(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_projects_tags       ON projects USING GIN (tags);
```

> `direct_fork_count` se actualiza mediante trigger (ver sección 3.3).
> `tree_fork_count` se calcula bajo demanda con una CTE recursiva (ver sección 3.4).

#### `project_bom` — Lista de materiales del proyecto

```sql
CREATE TABLE project_bom (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_id        UUID REFERENCES components(id) ON DELETE SET NULL,
    component_name      TEXT NOT NULL,   -- nombre libre si no está en catálogo
    quantity_required   INTEGER NOT NULL CHECK (quantity_required > 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bom_project   ON project_bom(project_id);
CREATE INDEX idx_bom_component ON project_bom(component_id);
```

> `quantity_available` y `status` (available / partial / missing) se calculan en tiempo de consulta cruzando con `stock`, no se persisten.

#### `project_log_entries` — Bitácora de avance

```sql
CREATE TYPE log_tag AS ENUM ('progress', 'problem', 'solution', 'learning', 'code');

CREATE TABLE project_log_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    tag         log_tag NOT NULL DEFAULT 'progress',
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_log_project ON project_log_entries(project_id, created_at DESC);
```

#### `project_log_images` — Imágenes de la bitácora

```sql
CREATE TABLE project_log_images (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_entry_id  UUID NOT NULL REFERENCES project_log_entries(id) ON DELETE CASCADE,
    storage_path  TEXT NOT NULL,   -- ruta en Supabase Storage
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### `project_code_resources` — Código adjunto a entradas de bitácora

Recurso opcional que puede adjuntarse a cualquier entrada de tipo `code`. No es obligatorio en ningún tipo de proyecto.

```sql
CREATE TYPE code_environment AS ENUM (
    'arduino',      -- Arduino IDE (.ino)
    'platformio',   -- PlatformIO (C/C++)
    'espidf',       -- ESP-IDF (C/C++)
    'zephyr',       -- Zephyr RTOS (C)
    'rust',         -- Rust (embassy, esp-hal)
    'esphome',      -- ESPHome (YAML)
    'micropython',  -- MicroPython (.py)
    'other'
);

CREATE TABLE project_code_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_entry_id    UUID NOT NULL REFERENCES project_log_entries(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,          -- ej. "main.cpp", "firmware.ino"
    language        TEXT NOT NULL,          -- ej. "cpp", "python", "yaml"
    environment     code_environment NOT NULL DEFAULT 'arduino',
    content         TEXT NOT NULL,          -- código fuente completo
    is_generated    BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE si fue generado por IA
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_code_log_entry ON project_code_resources(log_entry_id);
```

> El código generado por IA establece `is_generated = TRUE`. El código subido por el usuario tiene `is_generated = FALSE`.

#### `project_consumed_stock` — Componentes consumidos en el proyecto

```sql
CREATE TABLE project_consumed_stock (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stock_id          UUID NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    quantity_consumed INTEGER NOT NULL CHECK (quantity_consumed > 0),
    consumed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumed_project ON project_consumed_stock(project_id);
CREATE INDEX idx_consumed_stock   ON project_consumed_stock(stock_id);
```

#### `project_comments` — Comentarios de la comunidad

```sql
CREATE TABLE project_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_project ON project_comments(project_id, created_at DESC);
```

### 3.3 Triggers

```sql
-- Mantiene updated_at en stock y projects
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_updated_at
    BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Mantiene direct_fork_count en el proyecto padre
CREATE OR REPLACE FUNCTION update_direct_fork_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_project_id IS NOT NULL THEN
        UPDATE projects SET direct_fork_count = direct_fork_count + 1
        WHERE id = NEW.parent_project_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_project_id IS NOT NULL THEN
        UPDATE projects SET direct_fork_count = direct_fork_count - 1
        WHERE id = OLD.parent_project_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fork_count
    AFTER INSERT OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_direct_fork_count();
```

### 3.4 Consulta de `tree_fork_count`

```sql
-- Total de forks descendientes (directos + indirectos) para un proyecto dado
WITH RECURSIVE fork_tree AS (
    SELECT id FROM projects WHERE id = $1          -- nodo raíz
    UNION ALL
    SELECT p.id FROM projects p
    INNER JOIN fork_tree ft ON p.parent_project_id = ft.id
)
SELECT COUNT(*) - 1 AS tree_fork_count   -- -1 para excluir el nodo raíz
FROM fork_tree;
```

Esta consulta se ejecuta bajo demanda desde el cliente o se expone vía función RPC de Supabase. Para proyectos con alta actividad puede materializarse en una vista.

### 3.5 Políticas RLS

```sql
-- locations: acceso solo al propietario
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY loc_owner ON locations USING (auth.uid() = user_id);

-- stock: acceso solo al propietario
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY stock_owner ON stock USING (auth.uid() = user_id);

-- projects: propietario ve todos; resto solo ve los públicos
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY proj_owner  ON projects USING (auth.uid() = user_id);
CREATE POLICY proj_public ON projects FOR SELECT USING (is_public = TRUE);

-- project_log_entries: propietario ve todas; resto solo las públicas de proyectos públicos
ALTER TABLE project_log_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY log_owner  ON project_log_entries USING (auth.uid() = user_id);
CREATE POLICY log_public ON project_log_entries FOR SELECT
    USING (is_public = TRUE AND EXISTS (
        SELECT 1 FROM projects p WHERE p.id = project_id AND p.is_public = TRUE
    ));

-- project_comments: todos los autenticados pueden leer comentarios de proyectos públicos
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY comments_read ON project_comments FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM projects p WHERE p.id = project_id AND p.is_public = TRUE
    ));
CREATE POLICY comments_write ON project_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY comments_delete ON project_comments FOR DELETE
    USING (auth.uid() = user_id);

-- components: lectura para autenticados, escritura solo service_role
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
CREATE POLICY comp_read  ON components FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY comp_write ON components FOR ALL   USING (auth.role() = 'service_role');
```

---

## 4. API — FastAPI

### 4.1 Autenticación

Todas las rutas (excepto `/health`) requieren el header:
```
Authorization: Bearer <supabase_jwt>
```
El JWT se valida con la clave pública de Supabase (`SUPABASE_JWT_SECRET`).

### 4.2 Endpoints

#### Sistema

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/health` | Estado de la API |

#### Reconocimiento de componentes (módulo 3.2)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/ai/recognize` | Identifica un componente a partir de una imagen |

**Request** `POST /ai/recognize`
```
Content-Type: multipart/form-data
Body: image (file, required) — JPEG/PNG/WEBP, max 10 MB
```

**Response 200**
```json
{
  "name": "ESP32-C6 XIAO",
  "category": "Microcontrolador",
  "confidence": 0.91,
  "platform_family": "esp32",
  "connectivity_caps": {
    "wifi": "802.11ax",
    "ble": "5.0",
    "zigbee": true,
    "thread": true,
    "lora": false,
    "ethernet": false
  },
  "technical_specs": {
    "voltage": "3.3V",
    "interface": ["I2C", "SPI", "UART"],
    "package": "SMD",
    "cpu": "RISC-V 160MHz",
    "flash": "4MB"
  },
  "datasheet_url": "https://...",
  "low_confidence": false,
  "disambiguation_options": null
}
```

> Si `confidence < 0.70` → `low_confidence: true`. El frontend muestra aviso y solicita confirmación explícita.
> Si el modelo detecta variantes similares con confianza distribuida → `disambiguation_options: [{name, confidence, specs}, ...]`. El frontend presenta las opciones al usuario para selección manual.

#### Inteligencia de proyectos (módulo 3.5)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/ai/projects/discover` | Sugiere proyectos según el inventario actual |
| `POST` | `/ai/projects/plan` | Genera BOM para un proyecto descrito en lenguaje natural |

**Request** `POST /ai/projects/discover`
```json
{
  "inventory": [
    { "name": "ESP32-C6", "category": "Microcontrolador", "quantity": 2, "specs": { "interface": ["WiFi 6", "BLE"] } }
  ]
}
```

**Response 200**
```json
{
  "suggestions": [
    {
      "title": "Estación meteorológica WiFi",
      "description": "...",
      "difficulty": "intermediate",
      "viability_pct": 85,
      "bom": [
        {
          "component_name": "ESP32-C6",
          "quantity_required": 1,
          "status": "available"
        },
        {
          "component_name": "DHT22",
          "quantity_required": 1,
          "status": "available"
        },
        {
          "component_name": "BMP280",
          "quantity_required": 1,
          "status": "missing"
        },
        {
          "component_name": "ESP8266",
          "quantity_required": 1,
          "status": "incompatible",
          "incompatibility_reason": "No soporta WiFi 6 requerido por el proyecto",
          "alternatives": [
            { "type": "inventory_swap", "component_name": "ESP32-C6", "note": "Disponible en tu inventario" },
            { "type": "add_module",     "component_name": "Módulo WiFi ESP-01", "note": "Agregar como componente externo" }
          ]
        }
      ],
      "resources": ["https://..."]
    }
  ]
}
```

**Request** `POST /ai/projects/plan`
```json
{
  "description": "estación meteorológica solar con WiFi y pantalla OLED",
  "inventory": [ ... ],
  "refinement": {
    "preferred_controller": {
      "name": "ESP32-S3",
      "platform_family": "esp32",
      "from_inventory": false
    },
    "difficulty": "intermediate",
    "constraints": ["sin soldadura", "bajo consumo"]
  }
}
```

> `refinement` es completamente opcional. Si se omite, la IA elige el controlador más adecuado según el inventario.

**Response 200**
```json
{
  "title": "Estación Meteorológica Solar WiFi + OLED",
  "description": "...",
  "difficulty": "intermediate",
  "controller_note": null,
  "bom": [
    {
      "component_name": "ESP32-S3",
      "quantity_required": 1,
      "quantity_available": 0,
      "status": "missing"
    },
    {
      "component_name": "ESP32-C6",
      "quantity_required": 1,
      "quantity_available": 2,
      "status": "available",
      "incompatibility_reason": null
    },
    {
      "component_name": "Pantalla OLED 0.96\"",
      "quantity_required": 1,
      "quantity_available": 0,
      "status": "missing"
    }
  ]
}
```

> Si el `preferred_controller` es incompatible con los requisitos, `controller_note` incluye el aviso y las alternativas sugeridas (mismo formato que `alternatives` en `/discover`).

#### Generación y análisis de código (módulo 3.7)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/ai/code/generate` | Genera código para un proyecto según su tipo y BOM |
| `POST` | `/ai/code/analyze` | Analiza código existente y sugiere mejoras *(fase posterior)* |

**Request** `POST /ai/code/generate`
```json
{
  "project_id": "uuid",
  "project_type": "diy",
  "description": "estación meteorológica con DHT22 y pantalla OLED por I2C",
  "bom": [
    { "component_name": "ESP32-C6", "platform_family": "esp32" },
    { "component_name": "DHT22", "connectivity_caps": {} },
    { "component_name": "OLED SSD1306", "technical_specs": { "interface": "I2C" } }
  ],
  "environment": "arduino",
  "mode": "skeleton"
}
```

> `mode`: `"skeleton"` (estructura base comentada) o `"complete"` (código funcional completo).
> `environment`: uno de `arduino`, `platformio`, `espidf`, `zephyr`, `rust`, `esphome`, `micropython`.

**Response 200**
```json
{
  "filename": "weather_station.ino",
  "language": "cpp",
  "environment": "arduino",
  "content": "// Estación meteorológica — ESP32-C6 + DHT22 + OLED SSD1306\n#include ...",
  "explanation": "Este sketch inicializa el sensor DHT22 en el pin D2 y el display OLED en I2C (SDA=D4, SCL=D5)...",
  "dependencies": ["DHT sensor library", "Adafruit SSD1306"]
}
```

---

#### Generación de QR (módulo 3.4)

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `GET` | `/qr/{qr_code}` | Devuelve la imagen PNG del QR para una ubicación |

**Response 200** `Content-Type: image/png`

El QR codifica la URL `https://{FRONTEND_URL}/l/{qr_code}`.
La imagen incluye el nombre de la ubicación como texto bajo el QR (formato etiqueta 400×200 px).

Librería: [`qrcode`](https://pypi.org/project/qrcode/) + [`Pillow`](https://pypi.org/project/Pillow/) para componer la etiqueta.

### 4.3 Diseño del prompt — Reconocimiento de componentes

```
Eres un experto en electrónica embebida. Analiza la imagen y devuelve SOLO un JSON con:
{
  "name": "<nombre técnico exacto>",
  "category": "<Microcontrolador|Sensor|Alimentación|Actuador|Módulo|Pasivo>",
  "confidence": <0.0-1.0>,
  "platform_family": "<esp32|arduino|rpi|generic>",
  "connectivity_caps": {
    "wifi": "<estándar o false>",
    "ble":  "<versión o false>",
    "lora": <true|false>,
    "zigbee": <true|false>,
    "thread": <true|false>,
    "ethernet": <true|false>
  },
  "technical_specs": { "<clave>": "<valor>" },
  "datasheet_url": "<url o null>",
  "disambiguation_options": null
}

Si identificas 2 o más variantes posibles con confianza distribuida (ninguna supera 0.6),
devuelve la de mayor probabilidad en el objeto principal y las demás en:
"disambiguation_options": [{ "name": "...", "confidence": 0.X, "platform_family": "...", "connectivity_caps": {...} }]

No incluyas explicaciones fuera del JSON.
Si no puedes identificar el componente, devuelve confidence < 0.5.
```

### 4.4 Diseño del prompt — Inteligencia de proyectos

**Descubrimiento (`/ai/projects/discover`):**
```
Eres un asistente de proyectos de electrónica embebida. Dado este inventario:
{inventory_json}

Cada componente puede incluir connectivity_caps (wifi, ble, lora, etc.) y platform_family.

Sugiere hasta 5 proyectos realizables ordenados por viabilidad. Para cada proyecto devuelve JSON:
{
  title, description, difficulty, viability_pct,
  bom: [{
    component_name, quantity_required,
    status: "available"|"partial"|"missing"|"incompatible",
    incompatibility_reason: "<texto o null>",
    alternatives: [{ type: "inventory_swap"|"add_module", component_name, note }] | null
  }],
  resources: ["<url>"]
}

Marca "incompatible" cuando un componente del inventario no cumple el requisito técnico
(ej. MCU sin WiFi en proyecto que lo requiere). Nunca omitas alternativas para incompatibles.
```

**Planificación (`/ai/projects/plan`):**
```
Eres un asistente de proyectos de electrónica embebida. El usuario quiere construir:
"{description}"

Inventario disponible:
{inventory_json}

{refinement_block}
-- refinement_block se incluye solo si hay refinamiento:
-- "Controlador preferido: {name} ({platform_family}). Si es incompatible, indícalo en controller_note."
-- "Dificultad deseada: {difficulty}"
-- "Restricciones: {constraints}"

Genera la BOM completa para este proyecto y cruza con el inventario.
Devuelve JSON:
{
  title, description, difficulty,
  controller_note: "<aviso de incompatibilidad o null>",
  bom: [{
    component_name, quantity_required, quantity_available,
    status: "available"|"partial"|"missing"|"incompatible",
    incompatibility_reason: "<texto o null>",
    alternatives: [...] | null
  }]
}
```

**Generación de código (`/ai/code/generate`):**
```
Eres un experto en firmware para sistemas embebidos. Genera código para el siguiente proyecto:

Descripción: {description}
Tipo de proyecto: {project_type}  -- diy | prototype | professional
Entorno: {environment}            -- arduino | platformio | espidf | zephyr | rust | esphome | micropython
Modo: {mode}                      -- skeleton | complete
Componentes: {bom_json}

Criterios según tipo:
- diy: código simple, comentado, legible; prioriza claridad sobre optimización.
- prototype: funcional y estructurado; puede tener deuda técnica menor.
- professional: modular, manejo de errores, eficiencia energética, sin magic numbers.

Devuelve JSON:
{
  "filename": "<nombre_archivo.ext>",
  "language": "<cpp|python|yaml|rust>",
  "environment": "<entorno>",
  "content": "<código completo como string>",
  "explanation": "<explicación detallada de decisiones de diseño y configuración de pines>",
  "dependencies": ["<librería1>", "<librería2>"]
}
```

---

## 5. Frontend — Astro 6 + React 19

### 5.1 Estructura de rutas

```
src/
├── pages/
│   ├── index.astro              # Dashboard / resumen
│   ├── inventory/
│   │   ├── index.astro          # Lista de stock (SSG + ISR)
│   │   ├── new.astro            # Alta de componente (React Island)
│   │   └── [id].astro           # Detalle de componente
│   ├── locations/
│   │   ├── index.astro          # Árbol de ubicaciones
│   │   └── [id].astro           # Detalle de ubicación
│   ├── l/
│   │   └── [qr_code].astro      # Resolución de QR (requiere auth)
│   ├── projects/
│   │   ├── index.astro          # Proyectos del usuario
│   │   ├── [id].astro           # Detalle + bitácora
│   │   └── [id]/edit.astro      # Edición de proyecto
│   ├── community/
│   │   ├── index.astro          # Feed de proyectos públicos
│   │   └── [id].astro           # Vista pública de proyecto
│   └── ai/
│       ├── discover.astro       # "¿Qué puedo construir?"
│       └── plan.astro           # "Quiero construir X"
├── components/                  # React Islands (interactivos)
│   ├── inventory/
│   │   ├── ComponentForm.tsx    # Alta / edición de componente
│   │   ├── CameraCapture.tsx    # Captura de imagen + llamada IA
│   │   └── StockAdjuster.tsx    # Control de cantidad inline
│   ├── locations/
│   │   ├── LocationTree.tsx     # Árbol drag-and-drop
│   │   └── QRLabel.tsx          # Vista previa e impresión de QR
│   ├── projects/
│   │   ├── ProjectCard.tsx      # Tarjeta con estado, tipo y contadores
│   │   ├── LogTimeline.tsx      # Bitácora cronológica
│   │   ├── BOMTable.tsx         # Tabla BOM con estado de stock (incl. incompatible)
│   │   ├── ForkButton.tsx       # Like + fork en un clic
│   │   ├── CodeResource.tsx     # Visor/editor de código con botón de descarga
│   │   └── CodeGenerator.tsx   # Formulario de generación de código (entorno, modo)
│   ├── ai/
│   │   └── PlanRefinement.tsx   # Controles de refinamiento post-sugerencia inicial
│   └── community/
│       └── CommentThread.tsx    # Hilo de comentarios
└── layouts/
    ├── Base.astro               # Layout base (head, nav, footer)
    └── Auth.astro               # Layout con guard de autenticación
```

### 5.2 Estrategia de renderizado

| Página | Estrategia | Razón |
| :--- | :--- | :--- |
| Inventario (lista) | SSG + ISR (revalidar 60 s) | Datos del usuario, frecuencia moderada |
| Detalle de componente | SSG + ISR | Pocas actualizaciones |
| Árbol de ubicaciones | CSR (React Island) | Interacción drag-and-drop |
| QR resolve (`/l/[qr_code]`) | SSR | Requiere auth en servidor |
| Proyectos del usuario | CSR | Estado en tiempo real |
| Feed de comunidad | SSG + ISR (revalidar 30 s) | Contenido público con alta lectura |
| IA discover / plan | CSR | Llamada a API, no cacheable |

### 5.3 Cliente Supabase

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'  // generado con supabase gen types

export const supabase = createClient<Database>(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY
)
```

Los tipos TypeScript del esquema se generan con:
```bash
supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
```

---

## 6. Autenticación

Supabase Auth gestiona el ciclo completo. El frontend no implementa lógica de auth propia.

| Método | Proveedor | Notas |
| :--- | :--- | :--- |
| Magic Link | Email | Sin contraseña; enlace con TTL de 1 hora |
| OAuth | GitHub | Para perfil de maker/developer |
| OAuth | Google | Para perfil general |

**Guard de rutas:** el layout `Auth.astro` verifica la sesión vía `supabase.auth.getSession()`. Si no hay sesión redirige a `/login`.

**FastAPI:** recibe el JWT de Supabase en el header `Authorization`. Lo verifica con `python-jose` usando `SUPABASE_JWT_SECRET` (RS256).

```python
from jose import jwt, JWTError

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, settings.supabase_jwt_secret, algorithms=["RS256"])
        return payload
    except JWTError:
        raise HTTPException(status_code=401)
```

---

## 7. Almacenamiento de Imágenes (Supabase Storage)

| Bucket | Acceso | Contenido |
| :--- | :--- | :--- |
| `component-images` | Privado (RLS) | Fotos de componentes del inventario |
| `project-images` | Privado → público al publicar | Imágenes de bitácora y galería |

**Política de `component-images`:**
```sql
-- Solo el propietario puede leer y escribir
CREATE POLICY "component images owner"
ON storage.objects FOR ALL
USING (bucket_id = 'component-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Política de `project-images`:**
```sql
-- Propietario: acceso total
CREATE POLICY "project images owner"
ON storage.objects FOR ALL
USING (bucket_id = 'project-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Público: lectura solo si el proyecto está publicado
CREATE POLICY "project images public read"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'project-images' AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id::text = (storage.foldername(name))[2]
        AND p.is_public = TRUE
    )
);
```

La ruta de almacenamiento sigue el patrón:
- `component-images/{user_id}/{component_id}/{filename}`
- `project-images/{user_id}/{project_id}/{filename}`

---

## 8. PWA y Estrategia Offline

Configuración via `@vite-pwa/astro`:

```typescript
// astro.config.mjs
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp}'],
          runtimeCaching: [
            {
              // Inventario: cache-first, revalidar en background
              urlPattern: /\/inventory/,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'inventory-cache', expiration: { maxAgeSeconds: 3600 } }
            },
            {
              // Imágenes: cache-first, TTL largo
              urlPattern: /supabase\.co\/storage/,
              handler: 'CacheFirst',
              options: { cacheName: 'images-cache', expiration: { maxAgeSeconds: 86400 } }
            }
          ]
        },
        manifest: {
          name: 'IoT Assistant',
          short_name: 'IoT',
          theme_color: '#0f172a',
          icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }]
        }
      })
    ]
  }
})
```

**Comportamiento offline:**
- Inventario en modo lectura: disponible (caché de 1 hora).
- Acciones de escritura (alta, edición): bloqueadas con mensaje informativo.
- Páginas de comunidad: disponibles si fueron visitadas previamente.
- Llamadas a IA: no disponibles offline; se muestra estado de error claro.

---

## 9. Lógica de Forks y Contadores

### Flujo de fork

```
1. Usuario presiona "Me gusta / Fork" en proyecto público P
2. Cliente llama a Supabase:
   INSERT INTO projects (user_id, parent_project_id, title, description,
                         status, source, difficulty, tags)
   SELECT $user_id, id, title, description, 'saved', 'fork', difficulty, tags
   FROM projects WHERE id = $parent_id AND is_public = TRUE;

3. Trigger trg_fork_count incrementa direct_fork_count en P

4. Cliente redirige al usuario a su nuevo proyecto (estado: Guardado)
```

### Cálculo de tree_fork_count

Se expone como función RPC en Supabase para llamarla desde el cliente:

```sql
CREATE OR REPLACE FUNCTION get_tree_fork_count(project_id UUID)
RETURNS INTEGER AS $$
    WITH RECURSIVE fork_tree AS (
        SELECT id FROM projects WHERE id = project_id
        UNION ALL
        SELECT p.id FROM projects p
        INNER JOIN fork_tree ft ON p.parent_project_id = ft.id
    )
    SELECT COUNT(*) - 1 FROM fork_tree;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

Llamada desde el cliente:
```typescript
const { data } = await supabase.rpc('get_tree_fork_count', { project_id: id })
```

### Visualización de genealogía

La cadena de origen se construye en el cliente navegando `parent_project_id` iterativamente (máximo 10 saltos para evitar ciclos por datos corruptos):

```typescript
async function getOriginChain(projectId: string, maxDepth = 10) {
  const chain = []
  let current = projectId
  for (let i = 0; i < maxDepth; i++) {
    const { data } = await supabase
      .from('projects')
      .select('id, title, user_id, parent_project_id')
      .eq('id', current)
      .single()
    chain.push(data)
    if (!data?.parent_project_id) break
    current = data.parent_project_id
  }
  return chain  // [C, B, A]
}
```

---

## 10. Variables de Entorno

### Frontend (Astro / Vercel)

```bash
PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<anon-key>
PUBLIC_API_URL=https://<fastapi-domain>
PUBLIC_FRONTEND_URL=https://<vercel-domain>
```

### API (FastAPI)

```bash
SUPABASE_JWT_SECRET=<jwt-secret>
AI_PROVIDER=claude                          # claude | openai
ANTHROPIC_API_KEY=<key>                     # si AI_PROVIDER=claude
OPENAI_API_KEY=<key>                        # si AI_PROVIDER=openai
FRONTEND_URL=https://<vercel-domain>        # para URL del QR
```

---

## 11. Entorno de Desarrollo Local

```bash
# 1. Base de datos + API
cp .env.example .env          # ajustar variables
docker-compose up -d          # TimescaleDB en :5432, FastAPI en :8000

# 2. Frontend
npm install
npm run dev                   # Astro en :4321

# 3. Generar tipos TypeScript desde el esquema Supabase
npx supabase gen types typescript --local > src/lib/database.types.ts
```

El `docker-compose.yaml` levanta TimescaleDB e inicializa el esquema desde `supabase/schema.sql` automáticamente en el primer arranque.

---

## 12. Decisiones de Diseño Relevantes

| Decisión | Alternativa descartada | Razón |
| :--- | :--- | :--- |
| Supabase como BFF directo | API REST propia para CRUD | Evita una capa innecesaria; RLS garantiza seguridad sin código adicional |
| `direct_fork_count` en trigger | Conteo en consulta | Lecturas frecuentes del feed; el conteo en consulta escala mal |
| `tree_fork_count` en CTE bajo demanda | Columna materializada | La profundidad del árbol es impredecible; materializar requiere recálculo en cascada |
| `quantity_available` calculado en consulta | Columna persistida en `project_bom` | El stock cambia independientemente del proyecto; persistirlo generaría inconsistencias |
| `qr_code` inmutable | Regenerable | Las etiquetas físicas impresas deben ser válidas indefinidamente |
| Fork copia solo metadatos, no bitácora | Copiar bitácora completa | La bitácora es la experiencia personal del autor, no debe replicarse |
| `platform_family` como ENUM en `components` desde v1 | Agregar cuando se necesite | Permite soporte futuro de Raspberry Pi sin cambiar el esquema; costo cero en v1 |
| `connectivity_caps` en JSONB libre | ENUM de capacidades fijas | Las variantes de conectividad son impredecibles (LoRa sub-bandas, Zigbee vs Thread); JSONB permite extensión sin migraciones |
| Estado `incompatible` en BOM separado de `missing` | Tratar incompatible como faltante | La acción correctiva es distinta: swap de MCU vs comprar componente nuevo; mezclarlos confunde al usuario |
| Código fuente en tabla `project_code_resources` | Adjunto en Supabase Storage | Código es texto estructurado con metadatos (lenguaje, entorno, is_generated); Storage es para binarios/imágenes |
| `project_type` como ENUM en `projects` | Campo libre o sin tipo | El tipo determina defaults de visibilidad y la estrategia de generación de código; necesita ser tipado para lógica de servidor |
