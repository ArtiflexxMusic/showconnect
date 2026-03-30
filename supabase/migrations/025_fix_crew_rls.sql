-- ============================================================
-- Migratie 025: Security fix — crew kan geen rundowns aanmaken
--
-- Probleem: "Rundowns: aanmaken door show-leden" gebruikte
-- is_show_member() zonder rolcheck. Hierdoor konden crew-leden
-- (rol = 'crew', 'presenter', 'viewer') nieuwe rundowns aanmaken.
--
-- Fix: vervang is_show_member() door een expliciete rolcheck
-- die alleen owner en editor toestaat om rundowns aan te maken.
-- ============================================================

-- ── Rundowns INSERT: alleen owner en editor ──────────────────

DROP POLICY IF EXISTS "Rundowns: aanmaken door show-leden" ON rundowns;

CREATE POLICY "Rundowns: aanmaken door show-editors"
  ON rundowns FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = rundowns.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- ── is_show_member helper — voeg rolfilter toe (defensief) ───
-- De functie wordt ook gebruikt op de shows SELECT policy,
-- dus we laten hem zichzelf intact maar maken een veiligere
-- variant beschikbaar voor nieuwe policies.

CREATE OR REPLACE FUNCTION is_show_member(p_show_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM show_members
    WHERE show_id = p_show_id AND user_id = auth.uid()
  );
END;
$$;

-- Helper voor editor-check op show_id (ipv rundown_id)
CREATE OR REPLACE FUNCTION is_show_editor(p_show_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM show_members
    WHERE show_id = p_show_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'editor')
  );
END;
$$;
