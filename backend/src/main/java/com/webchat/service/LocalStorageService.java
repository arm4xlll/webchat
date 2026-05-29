package com.webchat.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Slf4j
@Service
public class LocalStorageService implements StorageService {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public String save(MultipartFile file) throws IOException {
        String extension = extractExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID() + extension;

        Path dir = Path.of(uploadDir, "stickers").toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Files.copy(file.getInputStream(), dir.resolve(filename));

        return "/uploads/stickers/" + filename;
    }

    @Override
    public void delete(String fileUrl) {
        // fileUrl вида /uploads/stickers/{filename}
        Path path = Path.of(uploadDir).toAbsolutePath().normalize()
                .resolve(fileUrl.replaceFirst("^/uploads/", ""));
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Failed to delete sticker file: {}", fileUrl, e);
        }
    }

    private String extractExtension(String filename) {
        if (filename == null) return "";
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot).toLowerCase() : "";
    }
}
