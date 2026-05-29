package com.webchat.dto.request;

import java.util.List;

public record CreateStickerPackRequest(
        String slug,
        String name,
        boolean isPublic,
        // Метаданные для каждого стикера; порядок должен совпадать с порядком файлов
        List<StickerMeta> stickers
) {
    public record StickerMeta(List<String> emojis) {}
}
