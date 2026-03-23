-- supabase/migrations/20260322_code_resources_versioning.sql
-- Crea la tabla project_code_resources con soporte de versioning desde el inicio.
-- DEFAULT 1 hace backfill automático de todas las filas existentes en PostgreSQL.
-- Nota: log_entry_id omitida (project_log_entries no existe aún en este entorno).
-- Nota: is_public omitida de la política SELECT (columna no existe aún en projects).

CREATE TABLE IF NOT EXISTS project_code_resources (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename        TEXT NOT NULL,
    language        TEXT NOT NULL,
    environment     TEXT CHECK (environment IN (
                        'arduino', 'platformio', 'esp-idf', 'zephyr', 'rust', 'esphome', 'micropython'
                    )),
    content         TEXT NOT NULL,
    is_generated    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         INTEGER NOT NULL DEFAULT 1,
    parent_id       UUID REFERENCES project_code_resources(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_code_resources_project ON project_code_resources(project_id);

CREATE INDEX IF NOT EXISTS idx_code_resources_filename
  ON project_code_resources(project_id, filename);

ALTER TABLE project_code_resources
  DROP CONSTRAINT IF EXISTS uq_resource_version;

ALTER TABLE project_code_resources
  ADD CONSTRAINT uq_resource_version UNIQUE (project_id, filename, version);

ALTER TABLE project_code_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY code_resources_select ON project_code_resources
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id
                AND p.user_id = auth.uid())
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
