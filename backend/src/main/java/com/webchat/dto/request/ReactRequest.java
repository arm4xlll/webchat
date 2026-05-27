package com.webchat.dto.request;

import java.util.UUID;

public record ReactRequest(UUID messageId, String emoji) {}
