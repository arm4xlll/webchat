package com.webchat.admin.dto;

import com.webchat.model.User;

import java.util.UUID;

public record AdminUserDto(
        UUID    id,
        String  username,
        String  name,
        String  avatarUrl,
        boolean isAdmin,
        boolean isRoot
) {
    public static AdminUserDto from(User user, String rootUsername) {
        return new AdminUserDto(
                user.getId(),
                user.getUsername(),
                user.getName(),
                user.getAvatarUrl(),
                user.isAdmin() || rootUsername.equals(user.getUsername()),
                rootUsername.equals(user.getUsername())
        );
    }
}
