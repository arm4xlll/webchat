package com.webchat.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

public interface StickerStorageService {

    /**
     * Сохраняет файл стикера в исходном виде без какой-либо обработки.
     * @return публичный URL для доступа к файлу
     */
    String store(MultipartFile file, String packSlug) throws IOException;

    void delete(String fileUrl);
}
