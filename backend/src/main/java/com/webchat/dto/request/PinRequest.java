package com.webchat.dto.request;

import java.util.UUID;

public record PinRequest(UUID messageId, boolean pinnedForAll) {}
