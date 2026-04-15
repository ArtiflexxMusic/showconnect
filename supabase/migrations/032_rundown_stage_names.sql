-- Kolom voor komma-gescheiden podium-/locatienamen per rundown,
-- gebruikt als datalist-suggesties bij het toevoegen van cues.
-- De applicatie stuurde deze kolom al mee bij UPDATEs van rundowns,
-- waardoor de save silent failde met "column stage_names does not exist".

ALTER TABLE rundowns
  ADD COLUMN IF NOT EXISTS stage_names TEXT NULL;

COMMENT ON COLUMN rundowns.stage_names IS
  'Komma-gescheiden lijst van podia/locaties (bv. "Hoofdpodium, Zaal 2"). Gebruikt voor cue-locatie-suggesties.';
