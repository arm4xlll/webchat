package com.webchat.dto.response;

import com.webchat.model.StickerPack;

import java.util.List;
import java.util.UUID;

public record StickerPackResponse(
        UUID id,
        String slug,
        String name,
        String thumbnailUrl,
        boolean isPublic,
        List<StickerResponse> stickers
) {
    public static StickerPackResponse from(StickerPack p) {
        List<StickerResponse> stickers = p.getStickers().stream()
                .map(StickerResponse::from)
                .toList();
        return new StickerPackResponse(
                p.getId(),
                p.getSlug(),
                p.getName(),
                p.getThumbnailUrl(),
                p.isPublic(),
                stickers
        );
    }

    /** Лёгкий вариант без стикеров — для списка паков пользователя */
    public static StickerPackResponse summary(StickerPack p) {
        return new StickerPackResponse(
                p.getId(),
                p.getSlug(),
                p.getName(),
                p.getThumbnailUrl(),
                p.isPublic(),
                List.of()
        );
    }
}
