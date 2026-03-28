-- ============================================================
-- CueBoard – Supabase SQL Fixes
-- Uitvoeren in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Controleer of show_members al data heeft ─────────────
SELECT sm.id, sm.role, sm.user_id, s.name as show_naam, p.email
FROM show_members sm
JOIN shows s ON s.id = sm.show_id
JOIN profiles p ON p.id = sm.user_id
ORDER BY s.name;

-- ── 2. Voeg bestaande show-makers toe als owner (veilig: ON CONFLICT) ──
INSERT INTO show_members (show_id, user_id, role)
SELECT id, created_by, 'owner'::show_member_role
FROM shows
WHERE created_by IS NOT NULL
ON CONFLICT (show_id, user_id) DO NOTHING;

-- ── 3. Controleer of Thomas admin is ───────────────────────
SELECT id, email, role FROM profiles WHERE email = 'info@artiflexx.nl';

-- ── 4. Zet Thomas als admin (voor het geval dat) ───────────
UPDATE profiles SET role = 'admin' WHERE email = 'info@artiflexx.nl';

-- ── 5. Zorg dat de is_admin() helper functie bestaat ───────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role = 'admin' FROM profiles WHERE id = auth.uid()
$$;

-- ── 6. RLS: admins mogen alle profielen lezen ───────────────
DROP POLICY IF EXISTS "Admin leest alle profielen" ON profiles;
CREATE POLICY "Admin leest alle profielen"
ON profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

-- ── 7. RLS: admins mogen elke rol aanpassen ─────────────────
DROP POLICY IF EXISTS "Admin update alle profielen" ON profiles;
CREATE POLICY "Admin update alle profielen"
ON profiles FOR UPDATE
USING (auth.uid() = id OR is_admin())
WITH CHECK (auth.uid() = id OR is_admin());

-- ── 8. RLS: show_members leesbaar voor leden van die show ───
-- (Voeg toe als het nog niet bestaat)
DROP POLICY IF EXISTS "Leden kunnen show_members zien" ON show_members;
CREATE POLICY "Leden kunnen show_members zien"
ON show_members FOR SELECT
USING (
  show_id IN (SELECT show_id FROM show_members WHERE user_id = auth.uid())
  OR is_admin()
);

-- ── 9. RLS: eigenaar mag leden beheren ──────────────────────
DROP POLICY IF EXISTS "Eigenaar beheert leden" ON show_members;
CREATE POLICY "Eigenaar beheert leden"
ON show_members FOR ALL
USING (
  show_id IN (SELECT show_id FROM show_members WHERE user_id = auth.uid() AND role = 'owner')
  OR is_admin()
);

-- ── 10. RLS: leden mogen zichzelf zien in show_members ──────
DROP POLICY IF EXISTS "Gebruiker ziet eigen lidmaatschap" ON show_members;
CREATE POLICY "Gebruiker ziet eigen lidmaatschap"
ON show_members FOR SELECT
USING (user_id = auth.uid());

-- ── 11. Controleer trigger: nieuwe show → eigenaar aanmaken ─
-- (Verifieer dat de trigger bestaat)
SELECT tgname, tgtype, proname
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'shows'::regclass;

-- Als de trigger ontbreekt, maak hem opnieuw aan:
CREATE OR REPLACE FUNCTION handle_new_show()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO show_members (show_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_show_created ON shows;
CREATE TRIGGER on_show_created
  AFTER INSERT ON shows
  FOR EACH ROW EXECUTE FUNCTION handle_new_show();

-- ── 12. Eindcontrole ─────────────────────────────────────────
SELECT 'show_members count' as check, count(*) FROM show_members
UNION ALL
SELECT 'shows count', count(*) FROM shows
UNION ALL
SELECT 'profiles count', count(*) FROM profiles;
