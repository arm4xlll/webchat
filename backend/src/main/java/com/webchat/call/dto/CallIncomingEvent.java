package com.webchat.call.dto;

import java.util.UUID;

public record CallIncomingEvent(UUID conversationId, UUID callerId, String callerName, String callerAvatar) {}
