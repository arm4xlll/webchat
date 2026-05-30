package com.webchat.call.dto;

import java.util.UUID;

public record CallTokenResponse(String token, String wsUrl, UUID conversationId) {}
