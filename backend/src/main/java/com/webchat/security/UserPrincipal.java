package com.webchat.security;

import lombok.Getter;

import java.security.Principal;
import java.util.UUID;

@Getter
public class UserPrincipal implements Principal {

    private final UUID userId;
    private final String username;
    private final UUID sessionId; // null for tokens issued before session tracking

    /** Backward-compat constructor (no session). */
    public UserPrincipal(UUID userId, String username) {
        this.userId = userId;
        this.username = username;
        this.sessionId = null;
    }

    public UserPrincipal(UUID userId, String username, UUID sessionId) {
        this.userId = userId;
        this.username = username;
        this.sessionId = sessionId;
    }

    @Override
    public String getName() {
        return username;
    }
}
