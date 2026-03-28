-- ============================================================
-- CueBoard – Feature uitbreiding v2
-- Uitvoeren via Supabase SQL Editor
-- ============================================================

-- 1. Cue kleur label (hex kleurcode bijv. '#ff6b6b')
ALTER TABLE cues ADD COLUMN IF NOT EXISTS color TEXT DEFAULT NULL;

-- 2. Auto-advance: volgende cue automatisch starten bij 0
ALTER TABLE cues ADD COLUMN IF NOT EXISTS auto_advance BOOLEAN DEFAULT FALSE;

-- 3. Rundown notities (zichtbaar in caller & crew view)
ALTER TABLE rundowns ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 4. Show client_code: korte code voor snel uitnodigingen (bijv. 'EVT-2025')
ALTER TABLE shows ADD COLUMN IF NOT EXISTS client_code TEXT DEFAULT NULL;

-- ============================================================
-- Klaar!
-- ============================================================
