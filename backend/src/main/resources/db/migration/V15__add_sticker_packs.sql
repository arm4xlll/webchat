CREATE TABLE sticker_packs
(
    id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug          VARCHAR(64)  NOT NULL UNIQUE,
    name          VARCHAR(128) NOT NULL,
    thumbnail_url TEXT,
    creator_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    is_public     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_sticker_packs_creator ON sticker_packs (creator_id);

CREATE TABLE stickers
(
    id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pack_id      UUID        NOT NULL REFERENCES sticker_packs (id) ON DELETE CASCADE,
    file_url     TEXT        NOT NULL,
    content_type VARCHAR(64) NOT NULL,
    media_type   VARCHAR(16) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    file_size    BIGINT,
    position     INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stickers_pack ON stickers (pack_id, position);

CREATE TABLE sticker_emojis
(
    sticker_id UUID        NOT NULL REFERENCES stickers (id) ON DELETE CASCADE,
    emoji      VARCHAR(8)  NOT NULL
);

CREATE INDEX idx_sticker_emojis_sticker ON sticker_emojis (sticker_id);
CREATE INDEX idx_sticker_emojis_emoji   ON sticker_emojis (emoji);

CREATE TABLE user_sticker_packs
(
    user_id  UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pack_id  UUID        NOT NULL REFERENCES sticker_packs (id) ON DELETE CASCADE,
    position INT         NOT NULL DEFAULT 0,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, pack_id)
);

CREATE INDEX idx_user_sticker_packs_user ON user_sticker_packs (user_id, position);
