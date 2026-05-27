package com.webchat.dto.response;

import com.webchat.model.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String username,
        String bio,
        String avatarUrl,
        String settings
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getSettings()
        );
    }
}
