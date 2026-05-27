CREATE TABLE pinned_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id      UUID NOT NULL REFERENCES messages(id)     ON DELETE CASCADE,
    pinned_by       UUID NOT NULL REFERENCES users(id)        ON DELETE CASCADE,
    pinned_for_all  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pin UNIQUE (conversation_id, message_id, pinned_by)
);
CREATE INDEX idx_pins_conv ON pinned_messages(conversation_id);
