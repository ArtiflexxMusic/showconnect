-- ============================================================
-- CueBoard – Rundown Templates
-- Uitvoeren in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Tabel aanmaken ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rundown_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cues_json   JSONB NOT NULL DEFAULT '[]',
  is_public   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index voor snelle queries op eigenaar
CREATE INDEX IF NOT EXISTS rundown_templates_created_by_idx
ON rundown_templates (created_by);

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE rundown_templates ENABLE ROW LEVEL SECURITY;

-- Lezen: eigen templates + publieke templates + admins zien alles
CREATE POLICY "Templates lezen"
ON rundown_templates FOR SELECT
USING (
  created_by = auth.uid()
  OR is_public = true
  OR is_admin()
);

-- Aanmaken: ingelogde gebruikers
CREATE POLICY "Templates aanmaken"
ON rundown_templates FOR INSERT
WITH CHECK (created_by = auth.uid());

-- Aanpassen: alleen eigenaar of admin
CREATE POLICY "Templates aanpassen"
ON rundown_templates FOR UPDATE
USING (created_by = auth.uid() OR is_admin());

-- Verwijderen: alleen eigenaar of admin
CREATE POLICY "Templates verwijderen"
ON rundown_templates FOR DELETE
USING (created_by = auth.uid() OR is_admin());

-- ── Verificatie ─────────────────────────────────────────────
SELECT 'rundown_templates aangemaakt' AS status, count(*) FROM rundown_templates;
