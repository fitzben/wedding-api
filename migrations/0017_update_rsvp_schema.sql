-- Add updated_at column to rsvps table
ALTER TABLE rsvps ADD COLUMN updated_at TEXT;

-- Add unique index on guest_id where it's not null to prevent multiple RSVPs per guest
CREATE UNIQUE INDEX IF NOT EXISTS idx_rsvps_guest_id_unique ON rsvps (guest_id) WHERE guest_id IS NOT NULL;
