-- Add enable_display_name to guests table
ALTER TABLE guests ADD COLUMN enable_display_name BOOLEAN DEFAULT 0;
