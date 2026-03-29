-- Migratie 019: Admin notities + e-mail notificatie voorkeur
-- Voer uit in Supabase Studio → SQL Editor

-- Admin-notities veld (alleen zichtbaar voor beheerders/admins)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_notes text DEFAULT NULL;

-- E-mail notificatie voorkeuren
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS notify_trial_emails boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_product_emails boolean NOT NULL DEFAULT true;
