-- Voeg secundaire cue-types toe als optionele tags naast de primaire `type`.
-- De primaire `type` blijft leidend voor kleur/sortering/filters. secondary_types
-- is puur additioneel zodat een cue meerdere disciplines kan dragen (bv. een
-- cue die zowel 'lighting' (primair) als 'audio' + 'video' raakt).

ALTER TABLE cues
  ADD COLUMN IF NOT EXISTS secondary_types TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN cues.secondary_types IS
  'Optionele extra cue-types naast de primaire `type`. Geldige waarden zijn dezelfde set als `type` (video|audio|lighting|speech|break|custom|intro|outro|presentation).';
