CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  slug TEXT UNIQUE,
  phone_number TEXT,
  category TEXT,
  priority TEXT,
  importance TEXT,
  pax_allowed INTEGER,
  invite_status TEXT,
  rsvp_status TEXT,
  created_at TEXT,
  updated_at TEXT,
  deleted_at TEXT
);