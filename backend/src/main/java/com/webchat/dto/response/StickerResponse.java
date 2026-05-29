package com.webchat.dto.response;

import com.webchat.model.Sticker;
import com.webchat.model.StickerType;

import java.util.List;
import java.util.UUID;

public record StickerResponse(
        UUID id,
        String fileUrl,
        String contentType,
        StickerType mediaType,
        Long fileSize,
        List<String> emojis
) {
    public static StickerResponse from(Sticker s) {
        return new StickerResponse(
                s.getId(),
                s.getFileUrl(),
                s.getContentType(),
                s.getMediaType(),
                s.getFileSize(),
                s.getEmojis()
        );
    }
}
