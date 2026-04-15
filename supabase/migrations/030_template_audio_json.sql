-- Add audio_json column to rundown_templates.
-- Bevat optioneel een snapshot van audio_devices + cue_audio_assignments,
-- zodat een template incl. mic patch kan worden opgeslagen en toegepast.
--
-- Schema van audio_json:
-- {
--   "devices": [
--     { "name": text, "type": 'handheld'|'headset'|'lapel'|'table'|'iem',
--       "channel": int|null, "color": text, "notes": text|null }
--   ],
--   "assignments": [
--     { "cue_index": int,       -- index in cues_json
--       "device_index": int,    -- index in devices
--       "person_name": text|null,
--       "phase": 'before'|'during'|'after' }
--   ]
-- }
--
-- cues_json + audio_json samen zijn self-contained: bij apply worden nieuwe
-- audio_devices voor de target-show aangemaakt en assignments aan de nieuwe
-- cue-ids en nieuwe device-ids gekoppeld.

ALTER TABLE rundown_templates
  ADD COLUMN IF NOT EXISTS audio_json JSONB NULL;

COMMENT ON COLUMN rundown_templates.audio_json IS
  'Optionele mic patch snapshot: { devices: [...], assignments: [{ cue_index, device_index, person_name, phase }] }. NULL als template geen mic patch bevat.';
