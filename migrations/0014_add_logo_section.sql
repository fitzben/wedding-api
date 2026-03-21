-- Add Logo section to gallery_sections
INSERT OR IGNORE INTO gallery_sections (id, name, key, accepts_video, sort_order, created_at) VALUES
  ('sec-logo', 'Logo / Branding', 'logo', 0, -1, datetime('now'));
