-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: gallery_sections + gallery_media + gifts
-- Run in your D1 database
-- ─────────────────────────────────────────────────────────────────────────────

-- Gallery Sections — each section maps to a part of the wedding invitation
CREATE TABLE IF NOT EXISTS gallery_sections (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  key            TEXT NOT NULL DEFAULT 'gallery',  -- hero | couple | holy_matrimony | resepsi | gallery | custom
  accepts_video  INTEGER NOT NULL DEFAULT 0,        -- 0 = photos only, 1 = photos + videos
  cover_media_id TEXT,                              -- FK to gallery_media.id (nullable)
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT,
  updated_at     TEXT
);

-- Gallery Media — individual photos/videos inside a section
CREATE TABLE IF NOT EXISTS gallery_media (
  id           TEXT PRIMARY KEY,
  section_id   TEXT NOT NULL REFERENCES gallery_sections(id) ON DELETE CASCADE,
  key          TEXT NOT NULL UNIQUE,   -- R2 object key e.g. gallery/section-id/uuid.jpg
  public_url   TEXT NOT NULL,          -- public CDN URL
  filename     TEXT,
  content_type TEXT,
  size         INTEGER DEFAULT 0,      -- bytes
  media_type   TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT,
  updated_at   TEXT,
  deleted_at   TEXT                    -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_gallery_media_section ON gallery_media(section_id);
CREATE INDEX IF NOT EXISTS idx_gallery_media_order   ON gallery_media(section_id, sort_order);

-- Seed default sections (adjust names to match your invitation structure)
INSERT OR IGNORE INTO gallery_sections (id, name, key, accepts_video, sort_order, created_at) VALUES
  ('sec-hero',  'Hero / Cover',    'hero',          0, 0, datetime('now')),
  ('sec-couple','Couple Photos',   'couple',         0, 1, datetime('now')),
  ('sec-hm',    'Holy Matrimony',  'holy_matrimony', 1, 2, datetime('now')),
  ('sec-res',   'Resepsi',         'resepsi',        1, 3, datetime('now')),
  ('sec-gallery','Gallery',        'gallery',        0, 4, datetime('now'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Gifts
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gifts (
  id                  TEXT PRIMARY KEY,
  type                TEXT NOT NULL CHECK (type IN ('bank_transfer', 'physical')),
  sender_name         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notes               TEXT,
  received_date       TEXT,          -- ISO date string

  -- Bank Transfer fields
  amount              REAL,
  bank_name           TEXT,
  account_number      TEXT,
  transfer_date       TEXT,

  -- Physical Gift fields
  product_name        TEXT,
  product_category    TEXT,
  product_description TEXT,
  product_link        TEXT,
  price_range_min     REAL,
  price_range_max     REAL,

  created_at          TEXT,
  updated_at          TEXT,
  deleted_at          TEXT           -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_gifts_type   ON gifts(type);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON gifts(status);
