CREATE TABLE sessions (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label           VARCHAR(100),
    user_agent      TEXT,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at      TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_user_active ON sessions(user_id) WHERE revoked_at IS NULL;
