-- Migration: Insert Admin User
-- Created: 2026-03-20

INSERT INTO users (id, name, email, password, role)
VALUES (
  '441cbc0c-f216-4b76-957b-ede4420a3e55',
  'Admin',
  'benjaminsitompul26@gmail.com',
  '$2a$10$4Y3jky0MtfUKsjqvOwQKIuUOXBNtAXfdTuHgudYssCXTm/6z/H3iy',
  'admin'
);
