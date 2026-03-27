-- ============================================================
-- Migratie 004: Media-laag voor cues + Storage RLS policies
-- ============================================================

-- 1. Media-velden toevoegen aan cues tabel
ALTER TABLE cues
  ADD COLUMN IF NOT EXISTS media_url       TEXT,
  ADD COLUMN IF NOT EXISTS media_path      TEXT,
  ADD COLUMN IF NOT EXISTS media_type      TEXT,
  ADD COLUMN IF NOT EXISTS media_filename  TEXT,
  ADD COLUMN IF NOT EXISTS media_size      BIGINT,
  ADD COLUMN IF NOT EXISTS media_volume    NUMERIC(3,2) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS media_loop      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS media_autoplay  BOOLEAN DEFAULT TRUE;

-- 2. Storage bucket aanmaken (als nog niet bestaat)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('cue-media', 'cue-media', true)
  ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS policies
CREATE POLICY "Ingelogde users kunnen media uploaden"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cue-media');

CREATE POLICY "Iedereen kan media lezen"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'cue-media');

CREATE POLICY "Ingelogde users kunnen eigen media verwijderen"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cue-media');
