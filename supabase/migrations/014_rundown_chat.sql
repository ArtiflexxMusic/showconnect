-- ============================================================
-- Migratie 014: Rundown Chat
-- ============================================================
-- Gedeelde chat per rundown voor caller, crew en editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS rundown_chat (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  rundown_id   uuid        NOT NULL REFERENCES rundowns(id) ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name  text        NOT NULL,
  sender_role  text        NOT NULL DEFAULT 'crew',
  message      text        NOT NULL CHECK (char_length(message) BETWEEN 1 AND 500),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index voor efficiënt ophalen van berichten per rundown
CREATE INDEX IF NOT EXISTS rundown_chat_rundown_id_idx
  ON rundown_chat (rundown_id, created_at ASC);

-- Realtime inschakelen
ALTER PUBLICATION supabase_realtime ADD TABLE rundown_chat;

-- RLS inschakelen
ALTER TABLE rundown_chat ENABLE ROW LEVEL SECURITY;

-- Lezen: ingelogde gebruikers die lid zijn van de show
CREATE POLICY "Chat leesbaar voor showleden"
  ON rundown_chat FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rundowns r
      JOIN show_members sm ON sm.show_id = r.show_id
      WHERE r.id = rundown_chat.rundown_id
        AND sm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM rundowns r
      JOIN shows s ON s.id = r.show_id
      WHERE r.id = rundown_chat.rundown_id
        AND s.created_by = auth.uid()
    )
  );

-- Schrijven: ingelogde gebruikers die lid zijn van de show
CREATE POLICY "Chat beschrijfbaar voor showleden"
  ON rundown_chat FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (
        SELECT 1 FROM rundowns r
        JOIN show_members sm ON sm.show_id = r.show_id
        WHERE r.id = rundown_chat.rundown_id
          AND sm.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM rundowns r
        JOIN shows s ON s.id = r.show_id
        WHERE r.id = rundown_chat.rundown_id
          AND s.created_by = auth.uid()
      )
    )
  );
