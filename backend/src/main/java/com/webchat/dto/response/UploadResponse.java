package com.webchat.dto.response;

public record UploadResponse(
        String fileUrl,
        String fileName,
        String fileType,
        long fileSize
) {}
