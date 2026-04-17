-- Ensure admin_users table exists with full schema
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'partner', 'parents')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migrate data from users to admin_users (skip if email already exists)
INSERT OR IGNORE INTO admin_users (id, name, email, password_hash, role, created_at)
SELECT id, name, email, password, role, created_at FROM users;

-- Drop old table
DROP TABLE IF EXISTS users;
