-- Migration 003: Presenter PIN & extra features
-- Run this in the Supabase SQL Editor

ALTER TABLE rundowns ADD COLUMN IF NOT EXISTS presenter_pin TEXT;

-- Zorg dat de realtime publicatie up to date is
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'rundowns'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rundowns;
  END IF;
END;
$$;
