-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0015: Gift Registry + Claims
-- ─────────────────────────────────────────────────────────────────────────────

-- Master list of registry items (managed by admin)
CREATE TABLE IF NOT EXISTS gift_registry (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  brand            TEXT,
  description      TEXT,
  image_url        TEXT,
  tag              TEXT,           -- Kitchen, Home, Experience, etc.
  quantity_needed  INTEGER NOT NULL DEFAULT 1,
  quantity_claimed INTEGER NOT NULL DEFAULT 0,
  price_range      TEXT,           -- display string e.g. "Rp 500.000 – 1.200.000"
  shop_url         TEXT,           -- Shopee/Tokped link
  sort_order       INTEGER NOT NULL DEFAULT 0,
  is_active        INTEGER NOT NULL DEFAULT 1,  -- 0 = hidden from public
  created_at       TEXT,
  updated_at       TEXT,
  deleted_at       TEXT
);

-- Each claim by a guest
CREATE TABLE IF NOT EXISTS gift_registry_claims (
  id          TEXT PRIMARY KEY,
  registry_id TEXT NOT NULL REFERENCES gift_registry(id),
  claimer_name TEXT NOT NULL,
  message     TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT
);

-- Index for fast claim count per item
CREATE INDEX IF NOT EXISTS idx_claims_registry_id ON gift_registry_claims(registry_id);