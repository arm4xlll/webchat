package com.webchat.dto.response;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        String label,
        String userAgent,
        String ipAddress,
        Instant createdAt,
        Instant lastActiveAt,
        boolean primary,
        boolean current
) {}
