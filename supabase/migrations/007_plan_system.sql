-- Migration 007: Plan systeem
-- Voegt plan, plan_source en plan_expires_at toe aan profiles
-- Plan bepaalt welke functies een gebruiker kan gebruiken
-- plan_source onderscheidt gratis toegang (gift) vs betaald (paid)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS plan        text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'pro', 'team')),
  ADD COLUMN IF NOT EXISTS plan_source text NOT NULL DEFAULT 'free'
    CHECK (plan_source IN ('free', 'gift', 'paid')),
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz DEFAULT NULL;

-- Index voor plan lookups
CREATE INDEX IF NOT EXISTS profiles_plan_idx ON profiles (plan);

-- Bestaande beheerders/admins krijgen team-plan (gift)
UPDATE profiles
SET plan = 'team', plan_source = 'gift'
WHERE role IN ('beheerder', 'admin') AND plan = 'free';

COMMENT ON COLUMN profiles.plan IS 'Abonnementstype: free | pro | team';
COMMENT ON COLUMN profiles.plan_source IS 'Hoe het plan verkregen is: free | gift (handmatig) | paid (Mollie)';
COMMENT ON COLUMN profiles.plan_expires_at IS 'Verloopdatum plan, NULL = nooit verlopen';
