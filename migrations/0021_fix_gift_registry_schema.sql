-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Fix Gift Registry Schema
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create gift_registry_claims table
CREATE TABLE IF NOT EXISTS gift_registry_claims (
  id           TEXT PRIMARY KEY,
  registry_id  TEXT NOT NULL REFERENCES gift_registry(id) ON DELETE CASCADE,
  claimer_name TEXT NOT NULL,
  message      TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_gift_registry_claims_id ON gift_registry_claims(registry_id);

-- 2. Add quantity_claimed column to gift_registry
-- Note: We use a subquery to sync this column if needed, 
-- but we must first ensure it exists for the current code to work.
ALTER TABLE gift_registry ADD COLUMN quantity_claimed INTEGER NOT NULL DEFAULT 0;

-- Sync the quantity_claimed column if there are existing claims (optional but good practice)
UPDATE gift_registry
SET quantity_claimed = COALESCE(
  (SELECT SUM(quantity) FROM gift_registry_claims WHERE registry_id = gift_registry.id),
  0
);
