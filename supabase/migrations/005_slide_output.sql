-- ============================================================
-- Migratie 005: Slide deck + Still image output voor rundowns
-- ============================================================

-- 1. Slide deck kolommen aan rundowns toevoegen
ALTER TABLE rundowns
  ADD COLUMN IF NOT EXISTS slide_url      TEXT,
  ADD COLUMN IF NOT EXISTS slide_path     TEXT,
  ADD COLUMN IF NOT EXISTS slide_type     TEXT CHECK (slide_type IN ('pdf', 'pptx', 'ppt')),
  ADD COLUMN IF NOT EXISTS slide_filename TEXT,
  ADD COLUMN IF NOT EXISTS still_url      TEXT,
  ADD COLUMN IF NOT EXISTS still_path     TEXT,
  ADD COLUMN IF NOT EXISTS notes          TEXT;

-- 2. Presentaties per cue
ALTER TABLE cues
  ADD COLUMN IF NOT EXISTS presentation_url      TEXT,
  ADD COLUMN IF NOT EXISTS presentation_path     TEXT,
  ADD COLUMN IF NOT EXISTS presentation_type     TEXT CHECK (presentation_type IN ('pdf', 'pptx')),
  ADD COLUMN IF NOT EXISTS presentation_filename TEXT,
  ADD COLUMN IF NOT EXISTS slide_control_mode    TEXT CHECK (slide_control_mode IN ('caller', 'presenter', 'both')),
  ADD COLUMN IF NOT EXISTS current_slide_index   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slide_index           INTEGER,
  ADD COLUMN IF NOT EXISTS color                 TEXT,
  ADD COLUMN IF NOT EXISTS auto_advance          BOOLEAN DEFAULT FALSE;

-- 3. Storage bucket 'presentations' aanmaken (als nog niet bestaat)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('presentations', 'presentations', true)
  ON CONFLICT (id) DO NOTHING;

-- 4. RLS policies voor de presentations bucket
DO $$
BEGIN
  -- Upload beleid
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Ingelogde users kunnen presentaties uploaden'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Ingelogde users kunnen presentaties uploaden"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'presentations');
  END IF;

  -- Lees beleid
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Iedereen kan presentaties lezen'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Iedereen kan presentaties lezen"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'presentations');
  END IF;

  -- Update beleid (upsert werkt via UPDATE)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Ingelogde users kunnen presentaties overschrijven'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Ingelogde users kunnen presentaties overschrijven"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'presentations');
  END IF;

  -- Verwijder beleid
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Ingelogde users kunnen presentaties verwijderen'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Ingelogde users kunnen presentaties verwijderen"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'presentations');
  END IF;
END;
$$;
