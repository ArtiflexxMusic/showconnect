-- ─────────────────────────────────────────────────────────────────────────────
-- 024_performance_indexes.sql
-- Indexes voor de meest-bevraagde kolommen in CueBoard.
-- Gratis, geen schema-wijziging — alleen snellere lookups.
-- ─────────────────────────────────────────────────────────────────────────────

-- audio_devices: elke keer dat mic patch of MicStatusBar laadt
CREATE INDEX IF NOT EXISTS idx_audio_devices_show
  ON audio_devices(show_id);

-- cue_audio_assignments: meest gebruikte tabel in de live view
--   • MicPatchPanel: .in('cue_id', [...])
--   • CrewView preload: .in('cue_id', [...])
--   • MicStatusBar fallback: .eq('cue_id', ...)
CREATE INDEX IF NOT EXISTS idx_cue_audio_cue
  ON cue_audio_assignments(cue_id);

--   • Opruimen bij verwijderen van een device
CREATE INDEX IF NOT EXISTS idx_cue_audio_device
  ON cue_audio_assignments(device_id);

-- cues: filter op status (running/pending/done) wordt overal gebruikt
CREATE INDEX IF NOT EXISTS idx_cues_status
  ON cues(rundown_id, status);

-- crew_annotations: geladen bij elke CrewView open
CREATE INDEX IF NOT EXISTS idx_crew_annotations_rundown
  ON crew_annotations(rundown_id);

-- rundown_templates: geladen bij template-modal
CREATE INDEX IF NOT EXISTS idx_rundown_templates_user
  ON rundown_templates(created_by);
