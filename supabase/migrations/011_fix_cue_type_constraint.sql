-- ============================================================
-- Migratie 011: Fix cues.type CHECK constraint
--
-- Probleem: de CHECK constraint op cues.type bevatte niet
-- 'presentation', waardoor cues van dat type niet opgeslagen
-- konden worden (stille DB-fout, UI toonde geen feedback).
--
-- Fix: drop de bestaande constraint en voeg een nieuwe toe
-- die alle huidige CueType waarden bevat.
-- ============================================================

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Zoek de huidige CHECK constraint op cues.type
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cues'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%type IN%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cues DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE 'Constraint % verwijderd', constraint_name;
  ELSE
    RAISE NOTICE 'Geen bestaande type-constraint gevonden (skip drop)';
  END IF;
END;
$$;

-- Voeg de nieuwe constraint toe met alle geldige types
ALTER TABLE cues
  ADD CONSTRAINT cues_type_check
  CHECK (type IN (
    'video', 'audio', 'lighting', 'speech',
    'break', 'custom', 'intro', 'outro', 'presentation'
  ));
