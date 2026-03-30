-- Migration 021: Fix cue DELETE RLS policy
-- Gebruik de helper-functie is_show_editor_of_rundown() voor consistentie.
-- De inline query in de vorige policy liet 'caller' ten onrechte niet toe bij verwijderen.

DROP POLICY IF EXISTS "Cues: verwijderen door show-editors" ON cues;

CREATE POLICY "Cues: verwijderen door show-editors"
  ON cues FOR DELETE
  USING (
    is_platform_admin()
    OR is_show_editor_of_rundown(rundown_id)
  );
