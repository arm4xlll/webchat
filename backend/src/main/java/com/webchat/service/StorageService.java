package com.webchat.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * Абстракция хранилища файлов.
 * Текущая реализация — {@link LocalStorageService} (локальная файловая система).
 * Чтобы переключиться на S3 — создай S3StorageService implements StorageService и пометь @Primary.
 */
public interface StorageService {

    /**
     * Сохраняет файл в исходном виде без сжатия и перекодирования.
     *
     * @return публичный URL для доступа к файлу (например, /uploads/stickers/uuid.webp)
     */
    String save(MultipartFile file) throws IOException;

    /**
     * Удаляет файл по URL, возвращённому из save().
     * Вызывается при откате: если один из стикеров не прошёл валидацию,
     * уже загруженные файлы нужно почистить.
     */
    void delete(String fileUrl);
}
