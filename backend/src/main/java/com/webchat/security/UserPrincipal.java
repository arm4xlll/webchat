package com.webchat.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.security.Principal;
import java.util.UUID;

@Getter
@AllArgsConstructor
public class UserPrincipal implements Principal {
    private final UUID userId;
    private final String username;

    @Override
    public String getName() {
        return username;
    }
}
