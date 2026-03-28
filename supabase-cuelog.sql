-- ============================================================
-- CueBoard – Cue Log (show history)
-- Uitvoeren in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabel cue_log ──────────────────────────────────────────
-- Registreert automatisch wanneer een cue op 'running' wordt gezet
CREATE TABLE IF NOT EXISTS cue_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cue_id        UUID NOT NULL REFERENCES cues(id) ON DELETE CASCADE,
  rundown_id    UUID NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  show_id       UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  cue_title     TEXT NOT NULL,
  cue_type      cue_type NOT NULL,
  cue_position  INT NOT NULL,
  triggered_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  triggered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_seconds INT NOT NULL DEFAULT 0
);

-- Indexen voor snelle queries
CREATE INDEX IF NOT EXISTS cue_log_rundown_id_idx ON cue_log (rundown_id);
CREATE INDEX IF NOT EXISTS cue_log_show_id_idx     ON cue_log (show_id);
CREATE INDEX IF NOT EXISTS cue_log_triggered_at_idx ON cue_log (triggered_at DESC);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE cue_log ENABLE ROW LEVEL SECURITY;

-- Leden van de show mogen de log lezen
CREATE POLICY "Show-leden lezen cue log"
ON cue_log FOR SELECT
USING (
  show_id IN (SELECT show_id FROM show_members WHERE user_id = auth.uid())
  OR is_admin()
);

-- Ingelogde gebruikers mogen log-entries aanmaken
CREATE POLICY "Ingelogden loggen cues"
ON cue_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ── Trigger: automatisch loggen als cue.status → 'running' ──
CREATE OR REPLACE FUNCTION log_cue_started()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_show_id UUID;
BEGIN
  -- Alleen loggen als status verandert naar 'running'
  IF NEW.status = 'running' AND (OLD.status IS DISTINCT FROM 'running') THEN
    -- Haal show_id op via rundown
    SELECT show_id INTO v_show_id FROM rundowns WHERE id = NEW.rundown_id;

    INSERT INTO cue_log (
      cue_id, rundown_id, show_id,
      cue_title, cue_type, cue_position,
      triggered_by, duration_seconds
    ) VALUES (
      NEW.id, NEW.rundown_id, v_show_id,
      NEW.title, NEW.type, NEW.position,
      auth.uid(), NEW.duration_seconds
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_cue_started ON cues;
CREATE TRIGGER on_cue_started
  AFTER UPDATE ON cues
  FOR EACH ROW EXECUTE FUNCTION log_cue_started();

-- ── Verificatie ─────────────────────────────────────────────
SELECT 'cue_log tabel aangemaakt' AS status;
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'cue_log' ORDER BY ordinal_position;
