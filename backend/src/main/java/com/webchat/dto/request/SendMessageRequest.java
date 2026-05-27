package com.webchat.dto.request;

import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SendMessageRequest(
        UUID conversationId,
        @Size(max = 4000) String content,
        String fileUrl,
        String fileName,
        String fileType,
        Long fileSize,
        UUID replyToId
) {
    public SendMessageRequest withConversationId(UUID id) {
        return new SendMessageRequest(id, content, fileUrl, fileName, fileType, fileSize, replyToId);
    }
}
