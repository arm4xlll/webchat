package com.webchat.call.dto;

import java.util.UUID;

public record CallEndedEvent(UUID conversationId) {}
