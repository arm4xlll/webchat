ALTER TABLE messages ADD COLUMN read_at TIMESTAMPTZ;

-- Retroactively populate read_at for old messages using existing conversation-level read timestamps
UPDATE messages m
SET read_at = cm.last_read_at
FROM conversation_members cm
WHERE m.conversation_id = cm.conversation_id
  AND m.sender_id != cm.user_id
  AND cm.last_read_at IS NOT NULL
  AND m.created_at <= cm.last_read_at;
