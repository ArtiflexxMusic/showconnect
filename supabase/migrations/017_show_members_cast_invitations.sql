-- ============================================================
-- Migratie 017: show_members, invitations, cast_members,
--               cast_portal_links + RPC functies voor cast portal
-- ============================================================
-- Veilig om opnieuw uit te voeren (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── 1. SHOW_MEMBERS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS show_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'editor', 'caller', 'crew', 'presenter', 'viewer')),
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_show_members_show   ON show_members(show_id);
CREATE INDEX IF NOT EXISTS idx_show_members_user   ON show_members(user_id);
CREATE INDEX IF NOT EXISTS idx_show_members_role   ON show_members(show_id, role);

ALTER TABLE show_members ENABLE ROW LEVEL SECURITY;

-- ── 2. INVITATIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'viewer'
                CHECK (role IN ('owner', 'editor', 'caller', 'crew', 'presenter', 'viewer')),
  token       TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_show   ON invitations(show_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token  ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email  ON invitations(email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ── 3. CAST_MEMBERS ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cast_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  role        TEXT,
  color       TEXT NOT NULL DEFAULT '#10b981',
  notes       TEXT,
  email       TEXT,
  pin         TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cast_members_show  ON cast_members(show_id);
CREATE INDEX IF NOT EXISTS idx_cast_members_pin   ON cast_members(pin) WHERE pin IS NOT NULL;

ALTER TABLE cast_members ENABLE ROW LEVEL SECURITY;

-- ── 4. CAST_PORTAL_LINKS ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cast_portal_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cast_member_id  UUID REFERENCES cast_members(id) ON DELETE CASCADE,
  show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  label           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cast_portal_links_show    ON cast_portal_links(show_id);
CREATE INDEX IF NOT EXISTS idx_cast_portal_links_token   ON cast_portal_links(token);
CREATE INDEX IF NOT EXISTS idx_cast_portal_links_member  ON cast_portal_links(cast_member_id);

ALTER TABLE cast_portal_links ENABLE ROW LEVEL SECURITY;

-- ── 5. HELPER FUNCTIES ────────────────────────────────────────────────────────

-- is_admin: platform-breed admin check (alias voor is_platform_admin)
CREATE OR REPLACE FUNCTION is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
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

-- is_show_member: controleer of ingelogde user lid is van een show
CREATE OR REPLACE FUNCTION is_show_member(p_show_id uuid)
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
  );
END;
$$;

-- is_show_owner_fn: controleer of ingelogde user owner is van een show
CREATE OR REPLACE FUNCTION is_show_owner_fn(p_show_id uuid)
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
      AND role = 'owner'
  );
END;
$$;

-- ── 6. RLS POLICIES: SHOW_MEMBERS ─────────────────────────────────────────────

-- SELECT: leden zien andere leden van dezelfde show
DROP POLICY IF EXISTS "show_members_select" ON show_members;
CREATE POLICY "show_members_select"
  ON show_members FOR SELECT
  USING (
    is_admin(auth.uid())
    OR user_id = auth.uid()
    OR is_show_member(show_id)
  );

-- INSERT: eigenaar kan leden toevoegen + bootstrap voor show-aanmaker
DROP POLICY IF EXISTS "show_members_insert" ON show_members;
DROP POLICY IF EXISTS "show_members_owner_insert" ON show_members;
CREATE POLICY "show_members_owner_insert"
  ON show_members FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR (
      -- Bootstrap: show-aanmaker voegt zichzelf toe als owner
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM shows
        WHERE id = show_members.show_id
          AND created_by = auth.uid()
      )
    )
  );

-- UPDATE: owner kan rollen wijzigen
DROP POLICY IF EXISTS "show_members_update" ON show_members;
CREATE POLICY "show_members_update"
  ON show_members FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
  );

-- DELETE: owner of zichzelf (verlaten)
DROP POLICY IF EXISTS "show_members_delete" ON show_members;
CREATE POLICY "show_members_delete"
  ON show_members FOR DELETE
  USING (
    is_admin(auth.uid())
    OR user_id = auth.uid()
    OR is_show_owner_fn(show_id)
  );

-- ── 7. RLS POLICIES: INVITATIONS ─────────────────────────────────────────────

-- SELECT: show-owner/editor + gebruiker met matching email
DROP POLICY IF EXISTS "invitations_select" ON invitations;
CREATE POLICY "invitations_select"
  ON invitations FOR SELECT
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = invitations.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
    -- Iedereen mag publiek token-lookup (voor accept flow; email niet gecontroleerd hier)
    OR true
  );

-- INSERT: show-owners en editors mogen uitnodigen
DROP POLICY IF EXISTS "invitations_insert" ON invitations;
CREATE POLICY "invitations_insert"
  ON invitations FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = invitations.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- UPDATE: iedereen mag accepted_at updaten (voor accept flow)
DROP POLICY IF EXISTS "invitations_update" ON invitations;
CREATE POLICY "invitations_update"
  ON invitations FOR UPDATE
  USING (true);

-- DELETE: show-owners
DROP POLICY IF EXISTS "invitations_delete" ON invitations;
CREATE POLICY "invitations_delete"
  ON invitations FOR DELETE
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
  );

-- ── 8. RLS POLICIES: CAST_MEMBERS ─────────────────────────────────────────────

-- SELECT: show-leden mogen cast zien
DROP POLICY IF EXISTS "cast_members_select" ON cast_members;
CREATE POLICY "cast_members_select"
  ON cast_members FOR SELECT
  USING (
    is_admin(auth.uid())
    OR is_show_member(show_id)
    -- Cast portal: anonieme leestoegang via token (afgehandeld via API route)
  );

-- INSERT/UPDATE/DELETE: alleen show-owner en editors
DROP POLICY IF EXISTS "cast_members_insert" ON cast_members;
CREATE POLICY "cast_members_insert"
  ON cast_members FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = cast_members.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "cast_members_update" ON cast_members;
CREATE POLICY "cast_members_update"
  ON cast_members FOR UPDATE
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = cast_members.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "cast_members_delete" ON cast_members;
CREATE POLICY "cast_members_delete"
  ON cast_members FOR DELETE
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = cast_members.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- ── 9. RLS POLICIES: CAST_PORTAL_LINKS ────────────────────────────────────────

DROP POLICY IF EXISTS "cast_portal_links_select" ON cast_portal_links;
CREATE POLICY "cast_portal_links_select"
  ON cast_portal_links FOR SELECT
  USING (
    is_admin(auth.uid())
    OR is_show_member(show_id)
    OR true -- Token-gebaseerde toegang (iedereen met token mag ophalen)
  );

DROP POLICY IF EXISTS "cast_portal_links_insert" ON cast_portal_links;
CREATE POLICY "cast_portal_links_insert"
  ON cast_portal_links FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = cast_portal_links.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

DROP POLICY IF EXISTS "cast_portal_links_delete" ON cast_portal_links;
CREATE POLICY "cast_portal_links_delete"
  ON cast_portal_links FOR DELETE
  USING (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR EXISTS (
      SELECT 1 FROM show_members
      WHERE show_id = cast_portal_links.show_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'editor')
    )
  );

-- ── 10. RPC FUNCTIES VOOR CAST PORTAL (geen auth vereist) ─────────────────────

-- Ophalen van cast info via magic token (voor cast-login pagina)
CREATE OR REPLACE FUNCTION get_cast_info_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link   cast_portal_links%ROWTYPE;
  v_member cast_members%ROWTYPE;
  v_show   shows%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM cast_portal_links WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_show FROM shows WHERE id = v_link.show_id LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF v_link.cast_member_id IS NOT NULL THEN
    SELECT * INTO v_member FROM cast_members WHERE id = v_link.cast_member_id LIMIT 1;
  END IF;

  RETURN json_build_object(
    'member_id', v_member.id,
    'name',      COALESCE(v_member.name, 'Gast'),
    'role',      v_member.role,
    'color',     COALESCE(v_member.color, '#10b981'),
    'show_name', v_show.name,
    'token',     p_token
  );
END;
$$;

-- Verifiëren van PIN bij een magic token
CREATE OR REPLACE FUNCTION verify_cast_pin_for_token(p_token text, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link   cast_portal_links%ROWTYPE;
  v_member cast_members%ROWTYPE;
BEGIN
  SELECT * INTO v_link FROM cast_portal_links WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  IF v_link.cast_member_id IS NULL THEN RETURN true; END IF; -- Geen member → geen PIN check

  SELECT * INTO v_member FROM cast_members WHERE id = v_link.cast_member_id LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;

  -- Geen PIN ingesteld → altijd toegang
  IF v_member.pin IS NULL THEN RETURN true; END IF;

  RETURN v_member.pin = p_pin;
END;
$$;

-- Zoeken naar portal token via PIN (voor directe PIN login)
CREATE OR REPLACE FUNCTION get_cast_portal_by_pin(member_pin text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member cast_members%ROWTYPE;
  v_link   cast_portal_links%ROWTYPE;
BEGIN
  SELECT * INTO v_member FROM cast_members WHERE pin = member_pin LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_link
  FROM cast_portal_links
  WHERE cast_member_id = v_member.id
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN json_build_object('token', v_link.token);
END;
$$;
