-- ─────────────────────────────────────────────────────────────────────────────
-- 028_shows_client_field.sql
-- Voegt een optioneel "client" veld toe aan shows.
-- Geïnspireerd door ShowCaller's "Voor welke klant" veld.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS client TEXT;
