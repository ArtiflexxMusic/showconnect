-- ============================================================
-- Migratie 009: Telefoonnummer toevoegen aan profielen
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text DEFAULT NULL;

-- Optionele index voor zoeken op telefoonnummer (admin)
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON profiles (phone)
  WHERE phone IS NOT NULL;
