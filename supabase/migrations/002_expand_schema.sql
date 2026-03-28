-- ============================================================
-- ShowConnect – Migratie 002 + 003: Uitgebreide velden
-- Plak dit in Supabase SQL Editor en klik RUN
-- (Veilig om meerdere keren uit te voeren – IF NOT EXISTS)
-- ============================================================

-- Cues: presenter, locatie, technische notities
ALTER TABLE cues ADD COLUMN IF NOT EXISTS presenter    TEXT;
ALTER TABLE cues ADD COLUMN IF NOT EXISTS location     TEXT;
ALTER TABLE cues ADD COLUMN IF NOT EXISTS tech_notes   TEXT;

-- Rundowns: show starttijd, Companion webhook, Presenter PIN
ALTER TABLE rundowns ADD COLUMN IF NOT EXISTS show_start_time       TIME;
ALTER TABLE rundowns ADD COLUMN IF NOT EXISTS companion_webhook_url TEXT;
ALTER TABLE rundowns ADD COLUMN IF NOT EXISTS presenter_pin         TEXT;

-- Realtime voor rundowns aanzetten (zodat settings-updates ook live zijn)
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
