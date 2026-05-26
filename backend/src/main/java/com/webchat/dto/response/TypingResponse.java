package com.webchat.dto.response;

import java.util.UUID;

public record TypingResponse(
        UUID conversationId,
        UUID userId,
        String username,
        boolean typing
) {}
