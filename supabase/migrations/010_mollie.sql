-- Mollie-velden op profiles
-- mollie_customer_id  : Mollie klant-ID (cst_xxxx)
-- mollie_subscription_id : actieve Mollie abonnements-ID (sub_xxxx)
-- plan_interval       : factuurperiode van het huidige betaalde plan

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mollie_customer_id    text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS mollie_subscription_id text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS plan_interval         text DEFAULT NULL
    CHECK (plan_interval IN ('monthly', 'yearly'));

CREATE INDEX IF NOT EXISTS profiles_mollie_customer_idx
  ON profiles (mollie_customer_id)
  WHERE mollie_customer_id IS NOT NULL;
