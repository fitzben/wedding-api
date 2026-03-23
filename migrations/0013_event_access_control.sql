-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0013: Event Access Control
--   - guest_groups.default_event_access  → template akses untuk semua anggota group
--   - guests.event_access_override       → override per-tamu (NULL = ikut group)
--
-- Values: 'both' | 'hm_only' | 'resepsi_only'
-- Resolve logic (di BE & FE):
--   guest.event_access_override ?? group.default_event_access ?? 'both'
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE guest_groups ADD COLUMN default_event_access TEXT NOT NULL DEFAULT 'both';
ALTER TABLE guests       ADD COLUMN event_access_override TEXT;
-- NULL on guests means "inherit from group"
