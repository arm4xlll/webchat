package com.webchat.dto.response;

import com.webchat.model.StickerPack;

import java.util.List;
import java.util.UUID;

public record StickerPackResponse(
        UUID id,
        String slug,
        String title,
        UUID creatorId,
        List<StickerResponse> stickers
) {
    public static StickerPackResponse from(StickerPack p) {
        return new StickerPackResponse(
                p.getId(),
                p.getSlug(),
                p.getTitle(),
                p.getCreator() != null ? p.getCreator().getId() : null,
                p.getStickers().stream().map(StickerResponse::from).toList()
        );
    }

    /** Без стикеров — для списка вкладок пользователя. */
    public static StickerPackResponse summary(StickerPack p) {
        return new StickerPackResponse(
                p.getId(), p.getSlug(), p.getTitle(),
                p.getCreator() != null ? p.getCreator().getId() : null,
                List.of());
    }
}
