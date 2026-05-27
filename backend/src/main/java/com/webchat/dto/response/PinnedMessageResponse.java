package com.webchat.dto.response;

import com.webchat.model.PinnedMessage;

import java.time.Instant;
import java.util.UUID;

public record PinnedMessageResponse(
        UUID id,
        UUID conversationId,
        UUID messageId,
        String content,
        String senderName,
        Instant messageSentAt,
        UUID pinnedByUserId,
        String pinnedByName,
        boolean pinnedForAll,
        Instant createdAt
) {
    public static PinnedMessageResponse from(PinnedMessage p) {
        var msg = p.getMessage();
        return new PinnedMessageResponse(
                p.getId(),
                p.getConversation().getId(),
                msg.getId(),
                msg.isDeleted() ? "" : msg.getContent(),
                msg.getSender().getName(),
                msg.getCreatedAt(),
                p.getPinnedBy().getId(),
                p.getPinnedBy().getName(),
                p.isPinnedForAll(),
                p.getCreatedAt()
        );
    }
}
