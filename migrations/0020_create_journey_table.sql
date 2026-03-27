-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: journey table
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS journey (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL,
  title        TEXT NOT NULL,
  desc         TEXT,
  photo_url    TEXT,
  bg           TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_journey_order ON journey(sort_order);

-- Seed initial data from reference Journey.jsx (optional but helpful for development)
INSERT OR IGNORE INTO journey (id, date, title, desc, bg, sort_order) VALUES
  ('j-1', 'December 2021', 'First Meeting', 'A serendipitous encounter where a brief conversation felt like reuniting with an old friend.', 'from-[#3d0510] to-[#960c23]', 0),
  ('j-2', 'March 2022', 'First Date', 'A quiet dinner that turned into hours of conversation neither of us wanted to end.', 'from-[#960c23] to-[#6b1020]', 1),
  ('j-3', 'June 2023', 'The Proposal', 'Under the stars, with shaking hands and a full heart, the question was asked.', 'from-[#3d0510] to-[#960c23]', 2),
  ('j-4', 'September 2023', 'Our Engagement', 'We said yes to forever, surrounded by the people we love most.', 'from-[#960c23] to-[#6b1020]', 3);
