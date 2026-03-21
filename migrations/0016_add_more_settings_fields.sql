-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0016: Extra Settings Fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Seed extra settings for each partner
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('groom_instagram',   '""',  datetime('now')),
  ('bride_instagram',   '""',  datetime('now')),
  ('groom_father',      '""',  datetime('now')),
  ('groom_mother',      '""',  datetime('now')),
  ('bride_father',      '""',  datetime('now')),
  ('bride_mother',      '""',  datetime('now')),
  ('groom_child_order', '""',  datetime('now')),
  ('bride_child_order', '""',  datetime('now'));
