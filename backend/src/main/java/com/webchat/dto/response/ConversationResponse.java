package com.webchat.dto.response;

import com.webchat.model.Conversation;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public record ConversationResponse(
        UUID id,
        String type,
        List<UserResponse> members,
        Instant createdAt,
        Map<UUID, Instant> lastReadAt
) {
    public static ConversationResponse from(Conversation conv) {
        List<UserResponse> memberList = conv.getMembers().stream()
                .map(m -> UserResponse.from(m.getUser()))
                .toList();
        Map<UUID, Instant> readAt = conv.getMembers().stream()
                .filter(m -> m.getLastReadAt() != null)
                .collect(Collectors.toMap(
                        m -> m.getUser().getId(),
                        m -> m.getLastReadAt()
                ));
        return new ConversationResponse(conv.getId(), conv.getType(), memberList, conv.getCreatedAt(), readAt);
    }
}
