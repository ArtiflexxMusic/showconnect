-- ============================================================
-- ShowConnect – Initial Database Schema
-- Voer dit uit in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- UUID extensie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profielen (gekoppeld aan Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'crew'
                CHECK (role IN ('admin', 'crew')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Shows (evenementen)
CREATE TABLE IF NOT EXISTS shows (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  date        DATE,
  venue       TEXT,
  description TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rundowns (per show kan meerdere rundowns hebben)
CREATE TABLE IF NOT EXISTS rundowns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_id     UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Hoofdrundown',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cues (de items in een rundown)
CREATE TABLE IF NOT EXISTS cues (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rundown_id       UUID NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL DEFAULT 0,
  title            TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'custom'
                     CHECK (type IN ('video', 'audio', 'lighting', 'speech', 'break', 'custom', 'intro', 'outro')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'running', 'done', 'skipped')),
  started_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_cues_rundown_id ON cues(rundown_id);
CREATE INDEX IF NOT EXISTS idx_cues_position   ON cues(rundown_id, position);
CREATE INDEX IF NOT EXISTS idx_rundowns_show   ON rundowns(show_id);
CREATE INDEX IF NOT EXISTS idx_shows_date      ON shows(date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shows     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rundowns  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cues      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profielen zichtbaar voor ingelogde users"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "User kan eigen profiel updaten"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Shows
CREATE POLICY "Shows zichtbaar voor ingelogde users"
  ON shows FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Ingelogde users kunnen shows aanmaken"
  ON shows FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Show-maker kan show updaten"
  ON shows FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Show-maker kan show verwijderen"
  ON shows FOR DELETE
  USING (auth.uid() = created_by);

-- Rundowns
CREATE POLICY "Rundowns zichtbaar voor ingelogde users"
  ON rundowns FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Ingelogde users kunnen rundowns beheren"
  ON rundowns FOR ALL
  USING (auth.role() = 'authenticated');

-- Cues
CREATE POLICY "Cues zichtbaar voor ingelogde users"
  ON cues FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Ingelogde users kunnen cues beheren"
  ON cues FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================================
-- REALTIME
-- ============================================================

-- Zorg dat de publicatie bestaat (is standaard aanwezig in Supabase)
-- Voeg tabellen toe aan realtime publicatie
ALTER PUBLICATION supabase_realtime ADD TABLE cues;
ALTER PUBLICATION supabase_realtime ADD TABLE rundowns;
ALTER PUBLICATION supabase_realtime ADD TABLE shows;

-- ============================================================
-- TRIGGERS & FUNCTIES
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rundowns_updated_at
  BEFORE UPDATE ON rundowns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cues_updated_at
  BEFORE UPDATE ON cues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-aanmaken van profiel bij nieuwe signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED DATA (optioneel – verwijder in productie)
-- ============================================================

-- Demo show en rundown worden aangemaakt na eerste login
-- via de app interface
