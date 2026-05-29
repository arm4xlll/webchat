-- Мигрируем схему стикерпаков на новую архитектуру.
-- Таблицы пусты (фича не была в проде), поэтому DROP + CREATE безопасен.

DROP TABLE IF EXISTS sticker_emojis;
DROP TABLE IF EXISTS user_sticker_packs;
DROP TABLE IF EXISTS stickers;
DROP TABLE IF EXISTS sticker_packs;

-- sticker_packs: убрали thumbnail_url и is_public, переименовали name → title
CREATE TABLE sticker_packs
(
    id         UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug       VARCHAR(64)  NOT NULL UNIQUE,
    title      VARCHAR(128) NOT NULL,
    creator_id UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- stickers: убрали отдельную таблицу эмодзи, добавили поле emojis (строка через запятую)
CREATE TABLE stickers
(
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pack_id      UUID         NOT NULL REFERENCES sticker_packs (id) ON DELETE CASCADE,
    file_url     TEXT         NOT NULL,
    content_type VARCHAR(64)  NOT NULL,
    media_type   VARCHAR(8)   NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO')),
    file_size    BIGINT,
    emojis       VARCHAR(255) NOT NULL DEFAULT '',
    position     INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- user_sticker_packs: убрали added_at, переименовали position → tab_order
-- (управляется Hibernate через @ManyToMany + @OrderColumn(name = "tab_order"))
CREATE TABLE user_sticker_packs
(
    user_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pack_id   UUID NOT NULL REFERENCES sticker_packs (id) ON DELETE CASCADE,
    tab_order INT  NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, pack_id)
);

CREATE INDEX idx_sticker_packs_creator  ON sticker_packs (creator_id);
CREATE INDEX idx_stickers_pack_position ON stickers (pack_id, position);
CREATE INDEX idx_user_sticker_packs_tab ON user_sticker_packs (user_id, tab_order);
