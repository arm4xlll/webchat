-- Add last_message_at to conversations for recency sorting
ALTER TABLE conversations ADD COLUMN last_message_at TIMESTAMP WITH TIME ZONE;

-- Backfill from existing messages
UPDATE conversations c
SET last_message_at = (
    SELECT MAX(m.created_at)
    FROM messages m
    WHERE m.conversation_id = c.id
);

-- Message reactions table
CREATE TABLE message_reactions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id   UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    emoji        VARCHAR(10) NOT NULL,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_message_user_emoji UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message_id ON message_reactions(message_id);
