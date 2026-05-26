package com.webchat.dto.response;

import com.webchat.model.Message;

import java.time.Instant;
import java.util.UUID;

public record MessageResponse(
        UUID id,
        UUID conversationId,
        UUID senderId,
        String senderUsername,
        String senderName,
        String content,
        String fileUrl,
        String fileName,
        String fileType,
        Long fileSize,
        Instant createdAt
) {
    public static MessageResponse from(Message m) {
        return new MessageResponse(
                m.getId(),
                m.getConversation().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                m.getSender().getName(),
                m.getContent(),
                m.getFileUrl(),
                m.getFileName(),
                m.getFileType(),
                m.getFileSize(),
                m.getCreatedAt()
        );
    }
}
