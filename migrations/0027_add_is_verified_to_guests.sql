-- Migration 0027: Add is_verified to guests
ALTER TABLE guests ADD COLUMN is_verified INTEGER DEFAULT 0;
