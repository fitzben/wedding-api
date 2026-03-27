-- Migration: create gift_registry table
-- Run once against your D1 database
-- wrangler d1 execute wedding-db --file=migrations/0005_gift_registry.sql

CREATE TABLE IF NOT EXISTS gift_registry (
  id                TEXT      PRIMARY KEY,
  name              TEXT      NOT NULL,
  brand             TEXT,
  description       TEXT,
  image_url         TEXT,
  tag               TEXT,                        -- e.g. "Kitchen", "Bedroom"
  quantity_needed   INTEGER   NOT NULL DEFAULT 1,
  price_range       TEXT,                        -- e.g. "Rp 950.000 - Rp 1.250.000"
  shop_url          TEXT,
  is_active         INTEGER   NOT NULL DEFAULT 1, -- 1 = shown publicly, 0 = hidden
  sort_order        INTEGER   NOT NULL DEFAULT 0,
  created_at        TEXT      NOT NULL,
  updated_at        TEXT      NOT NULL,
  deleted_at        TEXT                          -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_gift_registry_sort   ON gift_registry (sort_order);
CREATE INDEX IF NOT EXISTS idx_gift_registry_active ON gift_registry (is_active) WHERE deleted_at IS NULL;