package com.webchat.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SendMessageRequest(
        @NotNull UUID conversationId,
        @Size(max = 4000) String content,
        String fileUrl,
        String fileName,
        String fileType,
        Long fileSize,
        UUID replyToId
) {}
