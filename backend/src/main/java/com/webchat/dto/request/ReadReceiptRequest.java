package com.webchat.dto.request;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ReadReceiptRequest(
        @NotNull UUID conversationId
) {}
