CREATE UNIQUE INDEX idx_guests_slug ON guests(slug);
CREATE INDEX idx_guests_display_name ON guests(display_name);