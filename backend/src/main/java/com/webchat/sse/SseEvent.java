package com.webchat.sse;

import java.util.List;
import java.util.UUID;

public record SseEvent(
        List<UUID> recipients,
        String type,
        Object data
) {}
