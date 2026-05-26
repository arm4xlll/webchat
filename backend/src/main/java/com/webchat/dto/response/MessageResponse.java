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
        Instant createdAt,
        Instant editedAt,
        boolean deleted,
        UUID replyToId,
        String replyToContent,
        String replyToSenderName,
        Instant readAt
) {
    public static MessageResponse from(Message m) {
        UUID replyToId = null;
        String replyToContent = null;
        String replyToSenderName = null;

        if (m.getReplyTo() != null) {
            Message reply = m.getReplyTo();
            replyToId = reply.getId();
            replyToContent = reply.isDeleted() ? null : reply.getContent();
            replyToSenderName = reply.getSender().getName();
        }

        return new MessageResponse(
                m.getId(),
                m.getConversation().getId(),
                m.getSender().getId(),
                m.getSender().getUsername(),
                m.getSender().getName(),
                m.isDeleted() ? "" : m.getContent(),
                m.isDeleted() ? null : m.getFileUrl(),
                m.isDeleted() ? null : m.getFileName(),
                m.isDeleted() ? null : m.getFileType(),
                m.isDeleted() ? null : m.getFileSize(),
                m.getCreatedAt(),
                m.getEditedAt(),
                m.isDeleted(),
                replyToId,
                replyToContent,
                replyToSenderName,
                m.getReadAt()
        );
    }
}
