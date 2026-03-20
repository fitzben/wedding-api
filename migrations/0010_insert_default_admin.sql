-- --------------------------------------------------------------------------
-- Migration: Insert default admin
-- --------------------------------------------------------------------------

INSERT OR IGNORE INTO admin_users (id, name, email, password_hash, role, created_at, updated_at) 
VALUES (
  'admin-default-id-001', 
  'Admin', 
  'admin@admin.com', 
  '50dcdeb4b263a06663ac7d360ae0e35f:66a67d117169418c441a2fd5d47ee413f4ba1d8b7b38c1b3af05313f4403d90e',
  'admin',
  datetime('now'),
  datetime('now')
);
