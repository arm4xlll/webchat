package com.webchat.call.dto;

import java.util.UUID;

public record CallAnsweredEvent(UUID conversationId, boolean accepted) {}
