-- Migration: add registry_item_id to gifts
-- Link physical gift log entries to original wishlist items

ALTER TABLE gifts ADD COLUMN registry_item_id TEXT REFERENCES gift_registry(id);
CREATE INDEX IF NOT EXISTS idx_gifts_registry_item ON gifts(registry_item_id);
