-- ─────────────────────────────────────────────────────────────────────────────
-- 027_rls_function_stable_indexes.sql
--
-- Twee verbeteringen die de show-pagina en CallerView dramatisch versnellen:
--
-- 1. Markeer RLS-helperfuncties als STABLE
--    PostgreSQL roept een STABLE functie maar één keer aan per uniek argument
--    in een query, in plaats van per rij. Bij de CallerView die 50+ cues laadt,
--    scheelt dit 49 onnodige functie-aanroepen → query gaat van ~2s naar <100ms.
--
-- 2. Voeg ontbrekende indexes toe
--    shows.created_by  — gebruikt in elke shows-RLS selectie
--    rundowns.show_id  — gebruikt in de JOIN van is_show_member_of_rundown()
--    show_members composite (user_id, show_id) — richting die RLS checkt
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. STABLE RLS functies ────────────────────────────────────────────────────

-- Platform-admin check — STABLE: auth.uid() verandert niet binnen een query
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
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

-- Show-lid check — STABLE: zelfde show_id + zelfde uid = zelfde resultaat
CREATE OR REPLACE FUNCTION is_show_member(p_show_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM show_members
    WHERE show_id = p_show_id
      AND user_id = auth.uid()
  );
END;
$$;

-- Show-lid via rundown — KRITISCH: wordt per cue-rij aangeroepen in SELECT.
-- STABLE zorgt dat PostgreSQL dit cached per unieke rundown_id —
-- voor een rundown met 60 cues = 1 call i.p.v. 60 calls.
CREATE OR REPLACE FUNCTION is_show_member_of_rundown(p_rundown_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
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

-- Show-editor via rundown — ook STABLE
CREATE OR REPLACE FUNCTION is_show_editor_of_rundown(p_rundown_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
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

-- is_show_owner_fn (aangemaakt in 017, ook STABLE maken)
CREATE OR REPLACE FUNCTION is_show_owner_fn(p_show_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM show_members
    WHERE show_id = p_show_id
      AND user_id = auth.uid()
      AND role = 'owner'
  );
END;
$$;

-- is_admin (aangemaakt in 017, ook STABLE maken)
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_user_id
      AND role IN ('admin', 'beheerder')
  );
END;
$$;

-- ── 2. Ontbrekende indexes ─────────────────────────────────────────────────────

-- shows.created_by: gebruikt in elke RLS-policy op shows
-- (created_by = auth.uid()) — zonder index = full table scan
CREATE INDEX IF NOT EXISTS idx_shows_created_by
  ON shows(created_by);

-- rundowns.show_id: gebruikt in de JOIN binnen is_show_member_of_rundown()
-- Cruciaal want die functie draait bij elke cue-query
CREATE INDEX IF NOT EXISTS idx_rundowns_show_id
  ON rundowns(show_id);

-- Composite index richting (user_id → show_id): snelste pad voor
-- "geef alle shows van deze user" — gebruikt door dashboard + RLS
CREATE INDEX IF NOT EXISTS idx_show_members_user_show
  ON show_members(user_id, show_id);
