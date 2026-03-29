-- Migration 020: Admin permissions per gebruiker
-- Voegt een jsonb-kolom toe aan profiles voor granulaire admin-rechten.
-- Alleen van toepassing op gebruikers met rol 'admin' (niet 'beheerder').
-- Beheerders hebben altijd alle rechten ongeacht deze kolom.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_permissions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Bestaande admins krijgen een standaard set rechten
UPDATE profiles
SET admin_permissions = '["extend_trial","edit_users","admin_notes"]'::jsonb
WHERE role = 'admin' AND admin_permissions = '[]'::jsonb;
