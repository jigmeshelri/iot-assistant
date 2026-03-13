-- =============================================================================
-- IoT Assistant — Production Schema
-- Supabase (PostgreSQL 16 + TimescaleDB)
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS timescaledb;

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
-- TABLA: components
-- Catálogo maestro compartido. Lectura pública, escritura solo service_role.
-- =============================================================================
CREATE TABLE IF NOT EXISTS components (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             TEXT UNIQUE NOT NULL,               -- ej: "MCU-001", "SNS-002"
    name            TEXT NOT NULL,                      -- ej: "ESP32-C6 XIAO"
    category        TEXT NOT NULL CHECK (category IN (
                        'Microcontrolador',
                        'Sensor',
                        'Alimentación',
                        'Actuador',
                        'Módulo',
                        'Pasivo'
                    )),
    technical_specs JSONB NOT NULL DEFAULT '{}',
    datasheet_url   TEXT,
    image_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_components_specs ON components USING GIN (technical_specs);


-- =============================================================================
-- TABLA: locations
-- Jerarquía física por usuario (estante → caja → compartimento).
-- FK a auth.users garantiza integridad con Supabase Auth.
-- =============================================================================
CREATE TABLE IF NOT EXISTS locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    parent_id   UUID REFERENCES locations(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    qr_code     TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_locations_user   ON locations(user_id);
CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);


-- =============================================================================
-- TABLA: stock
-- Inventario privado: usuario ↔ componente ↔ ubicación + cantidad.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stock (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    component_id    UUID NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
    location_id     UUID REFERENCES locations(id) ON DELETE SET NULL,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    notes           TEXT,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_user      ON stock(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_component ON stock(component_id);

-- Trigger: mantiene updated_at sincronizado en cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_stock_updated_at
    BEFORE UPDATE ON stock
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- =============================================================================
-- TABLA: telemetry (TimescaleDB Hypertable)
-- Series temporales para métricas de dispositivos IoT.
-- =============================================================================
CREATE TABLE IF NOT EXISTS telemetry (
    time        TIMESTAMPTZ NOT NULL,
    device_id   UUID NOT NULL,
    metric_name TEXT NOT NULL,
    value       DOUBLE PRECISION NOT NULL,
    metadata    JSONB DEFAULT '{}'
);

SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- --- locations ---
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY locations_select ON locations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY locations_insert ON locations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY locations_update ON locations
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY locations_delete ON locations
    FOR DELETE USING (auth.uid() = user_id);


-- --- stock ---
ALTER TABLE stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY stock_select ON stock
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY stock_insert ON stock
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY stock_update ON stock
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY stock_delete ON stock
    FOR DELETE USING (auth.uid() = user_id);


-- --- components (catálogo: lectura pública, escritura solo service_role) ---
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

CREATE POLICY components_select ON components
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY components_write ON components
    FOR ALL USING (auth.role() = 'service_role');
