package com.webchat.dto.response;

import com.webchat.model.Conversation;
import com.webchat.model.User;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConversationResponse(
        UUID id,
        String type,
        List<UserResponse> members,
        Instant createdAt
) {
    public static ConversationResponse from(Conversation conv) {
        List<UserResponse> memberList = conv.getMembers().stream()
                .map(m -> UserResponse.from(m.getUser()))
                .toList();
        return new ConversationResponse(conv.getId(), conv.getType(), memberList, conv.getCreatedAt());
    }
}
