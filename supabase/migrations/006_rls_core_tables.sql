-- ============================================================
-- Migratie 006: Core table RLS hardening
-- Vervangt te permissieve "any authenticated user" policies
-- op shows, rundowns en cues door show-membership checks.
-- ============================================================

-- ── Helper functies ──────────────────────────────────────────

-- Platform-admin check (admin / beheerder rol)
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'beheerder')
  );
END;
$$;

-- Show-lid check via rundown (voor cue-policies)
CREATE OR REPLACE FUNCTION is_show_member_of_rundown(p_rundown_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rundowns r
    JOIN show_members sm ON sm.show_id = r.show_id
    WHERE r.id = p_rundown_id
      AND sm.user_id = auth.uid()
  );
END;
$$;

-- Show-editor via rundown (voor cue UPDATE/DELETE)
CREATE OR REPLACE FUNCTION is_show_editor_of_rundown(p_rundown_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rundowns r
    JOIN show_members sm ON sm.show_id = r.show_id
    WHERE r.id = p_rundown_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'editor', 'caller')
  );
END;
$$;

-- ── SHOWS ────────────────────────────────────────────────────

-- Verwijder te permissieve policies
DROP POLICY IF EXISTS "Shows zichtbaar voor ingelogde users" ON shows;
DROP POLICY IF EXISTS "Show-maker kan show updaten"           ON shows;
DROP POLICY IF EXISTS "Show-maker kan show verwijderen"       ON shows;
DROP POLICY IF EXISTS "Ingelogde users kunnen shows aanmaken" ON shows;

-- SELECT: alleen eigen shows + shows waarbij je lid bent + admins
CREATE POLICY "Shows: zichtbaar voor leden en admins"
  ON shows FOR SELECT
  USING (
    is_platform_admin()
    OR created_by = auth.uid()
    OR is_show_member(id)
  );

-- INSERT: elke ingelogde user kan een show aanmaken (wordt daarna automatisch owner)
CREATE POLICY "Shows: aanmaken als ingelogd"
  ON shows FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- UPDATE: eigenaar of owner/editor in show_members
CREATE POLICY "Shows: updaten door eigenaar of editor"
  ON shows FOR UPDATE
  USING (
    is_platform_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = shows.id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- DELETE: eigenaar of owner in show_members
CREATE POLICY "Shows: verwijderen door eigenaar of owner"
  ON shows FOR DELETE
  USING (
    is_platform_admin()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = shows.id
        AND user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- ── RUNDOWNS ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Rundowns zichtbaar voor ingelogde users"  ON rundowns;
DROP POLICY IF EXISTS "Ingelogde users kunnen rundowns beheren"  ON rundowns;

-- SELECT: show-leden en admins
CREATE POLICY "Rundowns: zichtbaar voor show-leden"
  ON rundowns FOR SELECT
  USING (
    is_platform_admin()
    OR is_show_member(show_id)
  );

-- INSERT: show-leden kunnen rundowns aanmaken
CREATE POLICY "Rundowns: aanmaken door show-leden"
  ON rundowns FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_show_member(show_id)
  );

-- UPDATE: owner, editor, caller mogen rundowns aanpassen
CREATE POLICY "Rundowns: updaten door show-editors"
  ON rundowns FOR UPDATE
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = rundowns.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor', 'caller')
    )
  );

-- DELETE: alleen owner/editor
CREATE POLICY "Rundowns: verwijderen door show-owners"
  ON rundowns FOR DELETE
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = rundowns.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- ── CUES ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cues zichtbaar voor ingelogde users"   ON cues;
DROP POLICY IF EXISTS "Ingelogde users kunnen cues beheren"   ON cues;

-- SELECT: alle show-leden (presenter, crew, caller, etc.) mogen cues lezen
CREATE POLICY "Cues: zichtbaar voor show-leden"
  ON cues FOR SELECT
  USING (
    is_platform_admin()
    OR is_show_member_of_rundown(rundown_id)
  );

-- INSERT: owner, editor, caller mogen cues aanmaken
CREATE POLICY "Cues: aanmaken door show-editors"
  ON cues FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR is_show_editor_of_rundown(rundown_id)
  );

-- UPDATE: owner, editor, caller mogen cues aanpassen (caller update status)
CREATE POLICY "Cues: updaten door show-editors"
  ON cues FOR UPDATE
  USING (
    is_platform_admin()
    OR is_show_editor_of_rundown(rundown_id)
  );

-- DELETE: alleen owner/editor
CREATE POLICY "Cues: verwijderen door show-editors"
  ON cues FOR DELETE
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM rundowns r
      JOIN show_members sm ON sm.show_id = r.show_id
      WHERE r.id = cues.rundown_id
        AND sm.user_id = auth.uid()
        AND sm.role IN ('owner', 'editor')
    )
  );
