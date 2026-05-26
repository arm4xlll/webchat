package com.webchat.dto.request;

public record SubscribeRequest(
        String endpoint,
        String p256dh,
        String auth
) {}
