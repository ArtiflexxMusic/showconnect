-- ============================================================
-- Migratie 013: Fix handle_new_user trigger search_path
-- ============================================================
-- Probleem: GoTrue (Supabase auth) gaf "Database error saving new user"
-- Oorzaak:  SECURITY DEFINER functies zonder SET search_path = public
--           kunnen 'profiles' tabel niet vinden door Supabase security hardening
-- Oplossing: SET search_path = public + expliciete public.profiles referentie
--            + EXCEPTION handler zodat trigger-fouten signup nooit breken
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW() + INTERVAL '3 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'handle_new_user error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
