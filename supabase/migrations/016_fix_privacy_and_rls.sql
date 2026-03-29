-- ============================================================
-- Migratie 016: Privacy fix — verwijder public read policies
--
-- Probleem: shows, rundowns en cues waren publiek leesbaar
-- voor iedereen (ook niet-leden) via "public read" policies.
-- Hierdoor kon elke ingelogde gebruiker alle shows zien.
--
-- Fix:
-- 1. Drop alle te-permissieve public read policies
-- 2. Fix show_members INSERT bootstrap zodat show-creators
--    zichzelf als owner kunnen toevoegen aan een nieuwe show
-- ============================================================

-- 1. Verwijder publieke lees-policies op shows
DROP POLICY IF EXISTS "public read shows" ON shows;
DROP POLICY IF EXISTS "shows_public_read_via_cast" ON shows;

-- 2. Verwijder publieke lees-policies op rundowns
DROP POLICY IF EXISTS "public read rundowns" ON rundowns;
DROP POLICY IF EXISTS "rundowns_public_read_for_output" ON rundowns;

-- 3. Verwijder publieke lees-policies op cues
DROP POLICY IF EXISTS "cues_public_read" ON cues;
DROP POLICY IF EXISTS "public read cues" ON cues;

-- 4. Fix show_members INSERT: bootstrap voor nieuwe shows
--    (creator kan zichzelf als owner toevoegen aan eigen show)
DROP POLICY IF EXISTS "show_members_owner_insert" ON show_members;
CREATE POLICY "show_members_owner_insert"
  ON show_members FOR INSERT
  WITH CHECK (
    is_admin(auth.uid())
    OR is_show_owner_fn(show_id)
    OR (
      -- Bootstrap: creator voegt zichzelf toe als owner aan eigen nieuwe show
      user_id = auth.uid()
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM shows
        WHERE id = show_members.show_id
          AND created_by = auth.uid()
      )
    )
  );
