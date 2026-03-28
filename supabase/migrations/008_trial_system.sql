-- Migration 008: 3-daagse trial voor nieuwe gebruikers
-- Voegt trial_ends_at toe aan profiles
-- De handle_new_user trigger wordt bijgewerkt zodat nieuwe gebruikers
-- automatisch 3 dagen volledig toegang krijgen.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN profiles.trial_ends_at IS '3-daagse trial eindtijd. NULL = geen actieve trial. Alleen ingesteld bij nieuwe registraties.';

-- Update de handle_new_user trigger om trial in te stellen bij nieuwe signups
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NOW() + INTERVAL '3 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index voor trial lookups (bijv. cronjob die verlopen trials verwerkt)
CREATE INDEX IF NOT EXISTS profiles_trial_ends_at_idx ON profiles (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
