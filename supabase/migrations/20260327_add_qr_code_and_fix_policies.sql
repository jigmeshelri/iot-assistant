-- =============================================================================
-- Migration: 2026-03-27
-- 1. Add qr_code column to locations
-- 2. Fix code_resources_select policy to allow access to public projects
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Add qr_code to locations
-- Generated automatically via DEFAULT if not provided.
-- -----------------------------------------------------------------------------
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS qr_code TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::TEXT;

-- -----------------------------------------------------------------------------
-- 2. Fix code_resources_select: previously only owner could SELECT.
--    Now owner OR public project can read code resources.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS code_resources_select ON project_code_resources;

CREATE POLICY code_resources_select ON project_code_resources
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects p WHERE p.id = project_code_resources.project_id
                AND (p.user_id = auth.uid() OR p.is_public = TRUE))
    );
