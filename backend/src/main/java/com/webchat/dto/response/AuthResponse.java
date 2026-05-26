package com.webchat.dto.response;

import java.util.UUID;

public record AuthResponse(
        UUID userId,
        String username,
        String name,
        String bio,
        String avatarUrl,
        String accessToken
) {}
