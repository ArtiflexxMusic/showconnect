-- Companion device tokens: koppelt een Companion-installatie aan een actieve rundown
CREATE TABLE IF NOT EXISTS companion_active (
  token        TEXT        PRIMARY KEY,
  rundown_id   UUID        NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Iedereen mag lezen (Companion heeft geen auth) — maar alleen eigenaar mag schrijven
ALTER TABLE companion_active ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read companion_active"
  ON companion_active FOR SELECT
  USING (true);

CREATE POLICY "owner write companion_active"
  ON companion_active FOR ALL
  USING (user_id = auth.uid());
