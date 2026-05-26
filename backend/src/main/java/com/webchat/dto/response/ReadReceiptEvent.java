package com.webchat.dto.response;

import java.time.Instant;
import java.util.UUID;

public record ReadReceiptEvent(
        UUID conversationId,
        UUID readerUserId,
        Instant lastReadAt
) {}
