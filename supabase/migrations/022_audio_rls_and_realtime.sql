-- ============================================================
-- CueBoard – Migratie 022: RLS + Realtime voor mic patch tabellen
-- Uitvoeren in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── audio_devices ─────────────────────────────────────────────────────────

-- Zorg dat de tabel bestaat (was al aangemaakt via SQL editor)
CREATE TABLE IF NOT EXISTS audio_devices (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id    uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name       text NOT NULL,
  type       text NOT NULL DEFAULT 'handheld',
  channel    integer,
  color      text NOT NULL DEFAULT '#10b981',
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS inschakelen
ALTER TABLE audio_devices ENABLE ROW LEVEL SECURITY;

-- Show-leden mogen audio_devices lezen
DROP POLICY IF EXISTS "Show members kunnen audio_devices lezen" ON audio_devices;
CREATE POLICY "Show members kunnen audio_devices lezen"
ON audio_devices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM show_members
    WHERE show_members.show_id = audio_devices.show_id
      AND show_members.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'beheerder')
  )
);

-- Show-owners en editors mogen audio_devices aanmaken/bewerken/verwijderen
DROP POLICY IF EXISTS "Show editors kunnen audio_devices beheren" ON audio_devices;
CREATE POLICY "Show editors kunnen audio_devices beheren"
ON audio_devices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM show_members
    WHERE show_members.show_id = audio_devices.show_id
      AND show_members.user_id = auth.uid()
      AND show_members.role IN ('owner', 'editor', 'caller')
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'beheerder')
  )
);

-- ── cue_audio_assignments ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cue_audio_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id      uuid NOT NULL REFERENCES cues(id) ON DELETE CASCADE,
  device_id   uuid NOT NULL REFERENCES audio_devices(id) ON DELETE CASCADE,
  person_name text,
  phase       text NOT NULL DEFAULT 'during',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cue_id, device_id, phase)
);

-- RLS inschakelen
ALTER TABLE cue_audio_assignments ENABLE ROW LEVEL SECURITY;

-- Alle show-leden mogen assignments lezen
DROP POLICY IF EXISTS "Show members kunnen assignments lezen" ON cue_audio_assignments;
CREATE POLICY "Show members kunnen assignments lezen"
ON cue_audio_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM cues c
    JOIN show_members sm ON sm.show_id = c.show_id -- vereenvoudigd via rundowns
    WHERE c.id = cue_audio_assignments.cue_id
      AND sm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'beheerder')
  )
);

-- Alle show-leden mogen assignments aanmaken en verwijderen (caller doet dit live)
DROP POLICY IF EXISTS "Show members kunnen assignments beheren" ON cue_audio_assignments;
CREATE POLICY "Show members kunnen assignments beheren"
ON cue_audio_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM cues c
    JOIN rundowns r ON r.id = c.rundown_id
    JOIN show_members sm ON sm.show_id = r.show_id
    WHERE c.id = cue_audio_assignments.cue_id
      AND sm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'beheerder')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM cues c
    JOIN rundowns r ON r.id = c.rundown_id
    JOIN show_members sm ON sm.show_id = r.show_id
    WHERE c.id = cue_audio_assignments.cue_id
      AND sm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'beheerder')
  )
);

-- ── Realtime publicatie (optioneel, voor directe DB-sync) ─────────────────
-- Voeg tabellen toe aan de Supabase Realtime publicatie
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cue_audio_assignments;
  EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE audio_devices;
  EXCEPTION WHEN duplicate_object OR undefined_object THEN NULL;
  END;
END $$;
