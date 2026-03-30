-- CueBoard – Migratie 023: REPLICA IDENTITY FULL voor Realtime column filters
-- Supabase vereist REPLICA IDENTITY FULL op tabellen wanneer je
-- gefilterde postgres_changes subscriptions gebruikt (filter: cue_id=eq.xxx).
-- Zonder dit werken DELETE-events niet correct en kunnen INSERT-filters
-- inconsistent gedrag vertonen.

ALTER TABLE audio_devices          REPLICA IDENTITY FULL;
ALTER TABLE cue_audio_assignments  REPLICA IDENTITY FULL;
