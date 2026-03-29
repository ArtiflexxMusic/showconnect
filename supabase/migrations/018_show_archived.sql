-- Migratie 018: shows kunnen worden gearchiveerd
-- Voeg archived_at toe aan de shows tabel

ALTER TABLE shows
  ADD COLUMN IF NOT EXISTS archived_at timestamptz DEFAULT NULL;

-- Index voor efficiënte filtering op gearchiveerde shows
CREATE INDEX IF NOT EXISTS shows_archived_at_idx ON shows (archived_at) WHERE archived_at IS NOT NULL;
