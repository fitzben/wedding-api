-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0012: Database Performance and Integrity
--   1. Add indexes for Foreign Key columns to improve JOIN performance
--   2. Explicitly document relationships in schema comments
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Guest to Guest Groups relationship
CREATE INDEX IF NOT EXISTS idx_guests_guest_group_id ON guests(guest_group_id);

-- 2. Guest to Admin Users relationship (Audit columns)
CREATE INDEX IF NOT EXISTS idx_guests_created_by ON guests(created_by);
CREATE INDEX IF NOT EXISTS idx_guests_updated_by ON guests(updated_by);
CREATE INDEX IF NOT EXISTS idx_guests_deleted_by ON guests(deleted_by);

-- 3. RSVP to Guest relationship
CREATE INDEX IF NOT EXISTS idx_rsvps_guest_id ON rsvps(guest_id);

-- 4. Media to Section relationship
CREATE INDEX IF NOT EXISTS idx_gallery_media_section_id ON gallery_media(section_id);

-- 5. Physical Gifts can optionally be related to a sender (though not strictly enforced by FK yet)
-- CREATE INDEX IF NOT EXISTS idx_gifts_sender_name ON gifts(sender_name);
