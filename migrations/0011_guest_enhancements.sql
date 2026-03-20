-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0011: Guest enhancements
--   1. Add created_by, updated_by, deleted_by audit columns to guests
--   2. Add guest_group column to guests
--   3. Add invitation_type column (digital | physical | both)
--   4. Create guest_groups lookup table
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Audit columns
ALTER TABLE guests ADD COLUMN created_by TEXT;
ALTER TABLE guests ADD COLUMN updated_by TEXT;
ALTER TABLE guests ADD COLUMN deleted_by TEXT;

-- 2. Group reference (FK to guest_groups.id)
ALTER TABLE guests ADD COLUMN guest_group_id TEXT;

-- 3. Invitation type flag  — values: 'digital' | 'physical' | 'both'
ALTER TABLE guests ADD COLUMN invitation_type TEXT NOT NULL DEFAULT 'digital';

-- 4. Guest groups lookup table
CREATE TABLE IF NOT EXISTS guest_groups (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,           -- e.g. "Keluarga Mama", "Keluarga Papa A"
  description TEXT,
  created_at  TEXT,
  updated_at  TEXT,
  deleted_at  TEXT
);
