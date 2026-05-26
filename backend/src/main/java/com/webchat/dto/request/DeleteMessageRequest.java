package com.webchat.dto.request;

import java.util.UUID;

public record DeleteMessageRequest(
        UUID conversationId,
        UUID messageId,
        boolean forEveryone
) {}
