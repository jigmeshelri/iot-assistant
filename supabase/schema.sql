-- =============================================================================
-- IoT Assistant — Production Schema
-- Single source of truth — matches live Supabase database as of 2026-03-27
-- Supabase (PostgreSQL 16)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- LOCAL DEV ONLY: stub del schema auth de Supabase.
-- En Supabase real este schema existe nativamente; no incluir en migrations.
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT NULL::UUID;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.role() RETURNS TEXT AS $$
    SELECT 'authenticated'::TEXT;
$$ LANGUAGE SQL STABLE;


-- =============================================================================
-- SHARED TRIGGER FUNCTION: mantiene updated_at en cada UPDATE
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- TABLA: components
-- Catálogo maestro compartido. Lectura pública para autenticados, escritura abierta.
-- Sin CHECK constraint en category (el live DB no lo tiene).
-- =============================================================================
CREATE TABLE IF NOT EXISTS components (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku                 TEXT UNIQUE,                             -- ej: "MCU-001", nullable
    name                TEXT NOT NULL,                           -- ej: "ESP32-C6 XIAO"
    category            TEXT NOT NULL,                           -- sin CHECK: ver live DB
    platform_family     TEXT,                                    -- ej: "ESP32"
    connectivity_caps   JSONB DEFAULT '{}',
    technical_specs     JSONB DEFAULT '{}',
    datasheet_url       TEXT,
    image_url           TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_components_specs        ON components USING GIN (technical_specs);
CREATE INDEX IF NOT EXISTS idx_components_connectivity ON components USING GIN (connectivity_caps);

ALTER TABLE components ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer, insertar y actualizar
CREATE POLICY components_select ON components
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY components_insert ON components
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY components_update ON components
    FOR UPDATE USING (auth.role() = 'authenticated');


-- =============================================================================
-- TABLA: locations
-- Jerarquía física por usuario (estante → caja → compartimento).
-- qr_code generado automáticamente por defecto.
-- =============================================================================
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    name        TEXT NOT NULL,
    parent_id   UUID REFERENCES locations(id),
    qr_code     TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_user   ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_select ON locations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY locations_insert ON locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY locations_update ON locations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY locations_delete ON locations
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- TABLA: stock
-- Inventario privado: usuario ↔ componente ↔ ubicación + cantidad.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    component_id    UUID NOT NULL REFERENCES components(id),
    location_id     UUID REFERENCES locations(id),
    quantity        INTEGER DEFAULT 1 CHECK (quantity >= 0),
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_user      ON stock(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_component ON stock(component_id);

CREATE TRIGGER trg_stock_updated_at
    BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_select ON stock
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY stock_insert ON stock
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY stock_update ON stock
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY stock_delete ON stock
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- TABLA: projects
-- Proyectos de usuarios — fork tree, visibilidad pública, estado, progreso.
-- =============================================================================
CREATE TABLE IF NOT EXISTS projects (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id),
    title               TEXT NOT NULL,
    description         TEXT,
    type                TEXT DEFAULT 'diy',                     -- columna legacy, ver project_type
    status              TEXT DEFAULT 'saved' CHECK (status IN (
                            'saved', 'in_progress', 'paused', 'completed', 'abandoned'
                        )),
    progress            INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    bom                 JSONB DEFAULT '[]',                      -- BOM inline (alternativa a project_bom)
    notes               TEXT,
    source              TEXT DEFAULT 'manual' CHECK (source IN (
                            'manual', 'ai_discover', 'ai_plan', 'fork'
                        )),
    difficulty          TEXT,
    tags                TEXT[] DEFAULT '{}',
    project_type        TEXT DEFAULT 'diy' CHECK (project_type IN (
                            'diy', 'prototype', 'professional'
                        )),
    parent_project_id   UUID REFERENCES projects(id),
    is_public           BOOLEAN DEFAULT FALSE,
    direct_fork_count   INTEGER DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_user   ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public) WHERE is_public = TRUE;

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: mantiene direct_fork_count en el proyecto padre
CREATE OR REPLACE FUNCTION maintain_direct_fork_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.parent_project_id IS NOT NULL THEN
        UPDATE projects SET direct_fork_count = direct_fork_count + 1
        WHERE id = NEW.parent_project_id;
    ELSIF TG_OP = 'DELETE' AND OLD.parent_project_id IS NOT NULL THEN
        UPDATE projects SET direct_fork_count = GREATEST(0, direct_fork_count - 1)
        WHERE id = OLD.parent_project_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.parent_project_id IS DISTINCT FROM NEW.parent_project_id THEN
            IF OLD.parent_project_id IS NOT NULL THEN
                UPDATE projects SET direct_fork_count = GREATEST(0, direct_fork_count - 1)
                WHERE id = OLD.parent_project_id;
            END IF;
            IF NEW.parent_project_id IS NOT NULL THEN
                UPDATE projects SET direct_fork_count = direct_fork_count + 1
                WHERE id = NEW.parent_project_id;
            END IF;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_project_fork_count
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH ROW EXECUTE FUNCTION maintain_direct_fork_count();

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_select ON projects
    FOR SELECT USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY projects_insert ON projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY projects_update ON projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY projects_delete ON projects
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- TABLA: project_bom
-- Bill of Materials estructurado de un proyecto.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_bom (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_id        UUID REFERENCES components(id) ON DELETE SET NULL,
    component_name      TEXT NOT NULL,   -- nombre explícito para componentes externos
    quantity_required   INTEGER DEFAULT 1 CHECK (quantity_required > 0),
    notes               TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_bom_project ON project_bom(project_id);

ALTER TABLE project_bom ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_bom_select ON project_bom
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_bom.project_id
                AND (p.user_id = auth.uid() OR p.is_public = TRUE))
    );

CREATE POLICY project_bom_insert ON project_bom
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_bom.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY project_bom_update ON project_bom
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_bom.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY project_bom_delete ON project_bom
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_bom.project_id AND p.user_id = auth.uid())
    );


-- =============================================================================
-- TABLA: project_log_entries
-- Bitácora de progreso del proyecto.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_log_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    content     TEXT NOT NULL,
    tag         TEXT DEFAULT 'progress' CHECK (tag IN (
                    'progress', 'problem', 'solution', 'learning', 'code'
                )),
    is_public   BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_entries_project ON project_log_entries(project_id);

ALTER TABLE project_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY log_entries_select ON project_log_entries
    FOR SELECT USING (
        auth.uid() = user_id OR
        (is_public = TRUE AND EXISTS (
            SELECT 1 FROM projects p WHERE p.id = project_log_entries.project_id AND p.is_public = TRUE
        ))
    );

CREATE POLICY log_entries_insert ON project_log_entries
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY log_entries_update ON project_log_entries
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY log_entries_delete ON project_log_entries
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- TABLA: project_log_images
-- Imágenes adjuntas a entradas de bitácora.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_log_images (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_entry_id    UUID NOT NULL REFERENCES project_log_entries(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_log_images_entry ON project_log_images(log_entry_id);

ALTER TABLE project_log_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY log_images_select ON project_log_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM project_log_entries e
            WHERE e.id = project_log_images.log_entry_id AND (
                e.user_id = auth.uid() OR
                (e.is_public = TRUE AND EXISTS (
                    SELECT 1 FROM projects p WHERE p.id = e.project_id AND p.is_public = TRUE
                ))
            )
        )
    );

CREATE POLICY log_images_insert ON project_log_images
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM project_log_entries e
            WHERE e.id = project_log_images.log_entry_id AND e.user_id = auth.uid()
        )
    );

CREATE POLICY log_images_delete ON project_log_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM project_log_entries e
            WHERE e.id = project_log_images.log_entry_id AND e.user_id = auth.uid()
        )
    );


-- =============================================================================
-- TABLA: project_code_resources
-- Bloques de código generados o escritos para el proyecto.
-- version + parent_id habilitan historial de versiones.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_code_resources (
    id              UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    language        TEXT NOT NULL,
    environment     TEXT CHECK (environment IN (
                        'arduino', 'platformio', 'esp-idf', 'zephyr', 'rust', 'esphome', 'micropython'
                    )),
    content         TEXT NOT NULL,
    is_generated    BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    version         INTEGER DEFAULT 1,
    parent_id       UUID REFERENCES project_code_resources(id),
    log_entry_id    UUID REFERENCES project_log_entries(id)
);

CREATE INDEX IF NOT EXISTS idx_code_resources_project ON project_code_resources(project_id);

ALTER TABLE project_code_resources ENABLE ROW LEVEL SECURITY;

-- SELECT: owner OR proyecto público
CREATE POLICY code_resources_select ON project_code_resources
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id
                AND (p.user_id = auth.uid() OR p.is_public = TRUE))
    );

CREATE POLICY code_resources_insert ON project_code_resources
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY code_resources_update ON project_code_resources
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY code_resources_delete ON project_code_resources
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id AND p.user_id = auth.uid())
    );


-- =============================================================================
-- TABLA: project_consumed_stock
-- Registro de componentes consumidos/asignados a un proyecto.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_consumed_stock (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stock_id            UUID NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    quantity_consumed   INTEGER CHECK (quantity_consumed > 0),
    consumed_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consumed_stock_project ON project_consumed_stock(project_id);
CREATE INDEX IF NOT EXISTS idx_consumed_stock_stock   ON project_consumed_stock(stock_id);

ALTER TABLE project_consumed_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY consumed_stock_select ON project_consumed_stock
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_consumed_stock.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY consumed_stock_insert ON project_consumed_stock
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_consumed_stock.project_id AND p.user_id = auth.uid())
    );

CREATE POLICY consumed_stock_delete ON project_consumed_stock
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_consumed_stock.project_id AND p.user_id = auth.uid())
    );


-- =============================================================================
-- TABLA: project_comments
-- Comentarios en proyectos públicos.
-- =============================================================================
CREATE TABLE IF NOT EXISTS project_comments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);

ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_comments_select ON project_comments
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_comments.project_id AND p.is_public = TRUE)
    );

CREATE POLICY project_comments_insert ON project_comments
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_comments.project_id AND p.is_public = TRUE)
    );

CREATE POLICY project_comments_delete ON project_comments
    FOR DELETE USING (auth.uid() = user_id);


-- =============================================================================
-- TABLA: error_logs
-- Log de errores de la aplicación. INSERT abierto para usuarios autenticados.
-- =============================================================================
CREATE TABLE IF NOT EXISTS error_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users(id),
    context     TEXT NOT NULL,
    message     TEXT NOT NULL,
    detail      JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- INSERT abierto: usuario autenticado (user_id propio o null para errores anónimos)
CREATE POLICY error_logs_insert ON error_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
