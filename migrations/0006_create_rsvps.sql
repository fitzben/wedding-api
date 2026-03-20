CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,
  guest_id TEXT,
  name TEXT NOT NULL,
  attendance TEXT NOT NULL,
  pax INTEGER NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);
