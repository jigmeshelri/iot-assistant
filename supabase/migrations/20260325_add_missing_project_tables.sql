-- Migration: add_missing_project_tables_and_columns
-- Applied: 2026-03-25
-- Adds tables and columns that were in schema.sql but not yet migrated to production

-- 1. projects: add missing columns
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS parent_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS direct_fork_count INTEGER NOT NULL DEFAULT 0;

-- 2. project_bom
CREATE TABLE IF NOT EXISTS project_bom (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    component_id UUID REFERENCES components(id) ON DELETE SET NULL,
    component_name TEXT NOT NULL,
    quantity_required INTEGER NOT NULL DEFAULT 1 CHECK (quantity_required > 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. project_log_entries
CREATE TABLE IF NOT EXISTS project_log_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    tag TEXT NOT NULL DEFAULT 'progress' CHECK (tag IN ('progress','problem','solution','learning','code')),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. project_log_images
CREATE TABLE IF NOT EXISTS project_log_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_entry_id UUID NOT NULL REFERENCES project_log_entries(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. project_consumed_stock
CREATE TABLE IF NOT EXISTS project_consumed_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    stock_id UUID NOT NULL REFERENCES stock(id) ON DELETE RESTRICT,
    quantity_consumed INTEGER NOT NULL CHECK (quantity_consumed > 0),
    consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. project_comments
CREATE TABLE IF NOT EXISTS project_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. project_code_resources: add missing log_entry_id
ALTER TABLE project_code_resources
    ADD COLUMN IF NOT EXISTS log_entry_id UUID REFERENCES project_log_entries(id) ON DELETE CASCADE;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_projects_parent ON projects(parent_project_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_project_bom_project ON project_bom(project_id);
CREATE INDEX IF NOT EXISTS idx_log_entries_project ON project_log_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_log_images_entry ON project_log_images(log_entry_id);
CREATE INDEX IF NOT EXISTS idx_consumed_stock_project ON project_consumed_stock(project_id);
CREATE INDEX IF NOT EXISTS idx_consumed_stock_stock ON project_consumed_stock(stock_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);

-- 9. RLS + policies (all tables)
-- See full policy definitions in schema.sql lines 345-499
