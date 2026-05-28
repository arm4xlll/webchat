package com.webchat.controller;

import com.webchat.dto.response.UploadResponse;
import com.webchat.security.UserPrincipal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Slf4j
public class FileController {

    private static final long MAX_SIZE = 50L * 1024 * 1024; // 50 MB

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> upload(@RequestParam("file") MultipartFile file,
                                                  @AuthenticationPrincipal UserPrincipal principal) throws IOException {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        if (file.getSize() > MAX_SIZE) {
            log.warn("File too large: {} bytes", file.getSize());
            return ResponseEntity.badRequest().build();
        }

        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String contentType = file.getContentType();
        if (contentType == null || contentType.isBlank()) {
            // Guess from extension
            contentType = guessContentType(originalName);
        }

        String ext = originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf('.'))
                : "";
        String storedName = UUID.randomUUID() + ext;

        Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        Path target = dir.resolve(storedName);
        Files.copy(file.getInputStream(), target);

        log.info("File uploaded: {} -> {} ({} bytes, type={})", originalName, storedName, file.getSize(), contentType);

        return ResponseEntity.ok(new UploadResponse(
                "/uploads/" + storedName,
                originalName,
                contentType,
                file.getSize()
        ));
    }

    private String guessContentType(String filename) {
        String lower = filename.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp4")) return "video/mp4";
        if (lower.endsWith(".webm")) return "video/webm";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".pdf")) return "application/pdf";
        if (lower.endsWith(".doc")) return "application/msword";
        if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
        if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (lower.endsWith(".zip")) return "application/zip";
        if (lower.endsWith(".rar")) return "application/x-rar-compressed";
        if (lower.endsWith(".txt")) return "text/plain";
        return "application/octet-stream";
    }
}
