-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: settings + admin_users
-- Run this in your D1 database
-- ─────────────────────────────────────────────────────────────────────────────

-- Settings table: generic key-value store for all app config
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,          -- stored as JSON string
  updated_at TEXT
);

-- Seed default settings
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('bride_name',             '"Nama Mempelai Wanita"',  datetime('now')),
  ('groom_name',             '"Nama Mempelai Pria"',    datetime('now')),
  ('bride_nickname',         '"Wanita"',                datetime('now')),
  ('groom_nickname',         '"Pria"',                  datetime('now')),
  ('couple_quote',           '""',                      datetime('now')),
  ('hm_venue_name',          '""',                      datetime('now')),
  ('hm_date',                '""',                      datetime('now')),
  ('hm_time_start',          '""',                      datetime('now')),
  ('hm_time_end',            '""',                      datetime('now')),
  ('hm_address',             '""',                      datetime('now')),
  ('hm_maps_url',            '""',                      datetime('now')),
  ('resepsi_venue_name',     '""',                      datetime('now')),
  ('resepsi_date',           '""',                      datetime('now')),
  ('resepsi_time_start',     '""',                      datetime('now')),
  ('resepsi_time_end',       '""',                      datetime('now')),
  ('resepsi_address',        '""',                      datetime('now')),
  ('resepsi_maps_url',       '""',                      datetime('now')),
  ('countdown_target',       '"resepsi"',               datetime('now')),
  ('countdown_override_date','""',                      datetime('now')),
  ('rsvp_enabled',           'true',                    datetime('now')),
  ('wishes_enabled',         'true',                    datetime('now')),
  ('gift_enabled',           'true',                    datetime('now')),
  ('maintenance_mode',       'false',                   datetime('now')),
  ('maintenance_message',    '"We''ll be right back!"', datetime('now')),
  ('wa_template',            '""',                      datetime('now'));

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,        -- PBKDF2 hashed, never plain text
  role          TEXT NOT NULL DEFAULT 'parents'
                  CHECK (role IN ('admin', 'partner', 'parents')),
  created_at    TEXT,
  updated_at    TEXT,
  deleted_at    TEXT                  -- soft delete if needed
);

-- Index for fast email lookup (used on login)
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
