-- ============================================================
-- Migratie 012: Stage-namen per rundown
--
-- Voegt een 'stage_names' kolom toe aan de rundowns tabel.
-- Opgeslagen als komma-gescheiden tekst.
-- Wordt gebruikt om in cue-formulieren een dropdown te bieden
-- voor het veld Locatie / Podium, zodat gebruikers niet elke
-- keer opnieuw hoeven te typen.
-- ============================================================

ALTER TABLE rundowns
  ADD COLUMN IF NOT EXISTS stage_names TEXT DEFAULT NULL;

COMMENT ON COLUMN rundowns.stage_names IS
  'Komma-gescheiden lijst van podium/locatie-namen voor snelle cue-invoer';
