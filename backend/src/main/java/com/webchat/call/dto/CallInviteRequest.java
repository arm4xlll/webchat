package com.webchat.call.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CallInviteRequest(@NotNull UUID conversationId) {}
