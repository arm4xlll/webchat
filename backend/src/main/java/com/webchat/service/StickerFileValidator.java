package com.webchat.service;

import com.webchat.model.StickerType;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.Set;

/**
 * Валидирует файл стикера по MIME-типу и расширению.
 * Файл НЕ перекодируется и не обрезается — только проверка безопасности.
 */
@Component
public class StickerFileValidator {

    private static final long MAX_STICKER_SIZE = 10L * 1024 * 1024; // 10 MB

    // Разрешённые MIME → тип стикера
    private static final Map<String, StickerType> ALLOWED_TYPES = Map.of(
            "image/png",       StickerType.IMAGE,
            "image/jpeg",      StickerType.IMAGE,
            "image/webp",      StickerType.IMAGE,
            "image/gif",       StickerType.IMAGE,
            "video/mp4",       StickerType.VIDEO,
            "video/quicktime", StickerType.VIDEO,
            "video/webm",      StickerType.VIDEO
    );

    // Разрешённые расширения (второй рубеж, в дополнение к MIME)
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            ".png", ".jpg", ".jpeg", ".webp", ".gif",
            ".mp4", ".mov", ".webm"
    );

    /**
     * @return тип стикера (IMAGE или VIDEO) если файл прошёл валидацию
     * @throws IllegalArgumentException если файл не соответствует требованиям
     */
    public StickerType validateAndDetect(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Sticker file must not be empty");
        }

        if (file.getSize() > MAX_STICKER_SIZE) {
            throw new IllegalArgumentException(
                    "Sticker file exceeds maximum size of " + (MAX_STICKER_SIZE / 1024 / 1024) + " MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.containsKey(contentType)) {
            throw new IllegalArgumentException("Unsupported sticker content type: " + contentType);
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename != null) {
            String ext = extractExtension(originalFilename);
            if (!ext.isEmpty() && !ALLOWED_EXTENSIONS.contains(ext)) {
                throw new IllegalArgumentException("Unsupported sticker file extension: " + ext);
            }
        }

        return ALLOWED_TYPES.get(contentType);
    }

    private String extractExtension(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : "";
    }
}
