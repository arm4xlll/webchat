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
        UUID replyToId,
        /** Optimistic client-side id, echoed back so the sender can reconcile
         *  its temporary message in place instead of duplicating it. */
        String clientId
) {
    public SendMessageRequest withConversationId(UUID id) {
        return new SendMessageRequest(id, content, fileUrl, fileName, fileType, fileSize, replyToId, clientId);
    }
}
