-- ============================================================
-- Migratie 026: Green Room permissies per lid
--
-- Voegt een JSONB-kolom 'permissions' toe aan cast_members.
-- Hiermee kan per Green Room gast worden ingesteld wat ze
-- mogen zien en doen in de Green Room portal.
--
-- Standaard permissies (alles aan, tech-notities uit):
-- {
--   "view_all_cues":   true,   -- Volledig programma zien
--   "edit_cues":       true,   -- Cue-naam en locatie aanpassen
--   "view_tech_notes": false,  -- Technische notities zien
--   "view_countdown":  true    -- Live countdown zien
-- }
-- ============================================================

ALTER TABLE cast_members
  ADD COLUMN IF NOT EXISTS permissions jsonb
  NOT NULL DEFAULT '{
    "view_all_cues":   true,
    "edit_cues":       true,
    "view_tech_notes": false,
    "view_countdown":  true
  }'::jsonb;
