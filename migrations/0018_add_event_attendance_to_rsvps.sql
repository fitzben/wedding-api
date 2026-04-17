-- Add event_attendance to rsvps
-- Values: 'hm_only' | 'resepsi_only' | 'both' | NULL
ALTER TABLE rsvps ADD COLUMN event_attendance TEXT;
