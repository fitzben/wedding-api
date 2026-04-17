-- Role permissions table
-- Stores which menus/tabs each role can access
-- admin role always has full access, only partner and parents are configurable
CREATE TABLE IF NOT EXISTS role_permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('partner', 'parents')),
  resource TEXT NOT NULL,
  allowed INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(role, resource)
);

-- Default permissions for partner
INSERT OR IGNORE INTO role_permissions (id, role, resource, allowed) VALUES
  (lower(hex(randomblob(16))), 'partner', 'dashboard', 1),
  (lower(hex(randomblob(16))), 'partner', 'guests', 1),
  (lower(hex(randomblob(16))), 'partner', 'groups', 1),
  (lower(hex(randomblob(16))), 'partner', 'rsvp', 1),
  (lower(hex(randomblob(16))), 'partner', 'wishes', 1),
  (lower(hex(randomblob(16))), 'partner', 'journey', 1),
  (lower(hex(randomblob(16))), 'partner', 'gallery', 1),
  (lower(hex(randomblob(16))), 'partner', 'gifts', 1),
  (lower(hex(randomblob(16))), 'partner', 'settings', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.wedding', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.features', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.users', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.whatsapp', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.livestream', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.dresscode', 0),
  (lower(hex(randomblob(16))), 'partner', 'settings.security', 0);

-- Default permissions for parents
INSERT OR IGNORE INTO role_permissions (id, role, resource, allowed) VALUES
  (lower(hex(randomblob(16))), 'parents', 'dashboard', 1),
  (lower(hex(randomblob(16))), 'parents', 'guests', 1),
  (lower(hex(randomblob(16))), 'parents', 'groups', 0),
  (lower(hex(randomblob(16))), 'parents', 'rsvp', 1),
  (lower(hex(randomblob(16))), 'parents', 'wishes', 1),
  (lower(hex(randomblob(16))), 'parents', 'journey', 0),
  (lower(hex(randomblob(16))), 'parents', 'gallery', 0),
  (lower(hex(randomblob(16))), 'parents', 'gifts', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.wedding', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.features', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.users', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.whatsapp', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.livestream', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.dresscode', 0),
  (lower(hex(randomblob(16))), 'parents', 'settings.security', 0);
