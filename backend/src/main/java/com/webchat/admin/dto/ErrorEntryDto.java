package com.webchat.admin.dto;

import java.time.Instant;

public record ErrorEntryDto(
        Instant timestamp,
        String  type,
        String  message,
        String  stackTrace
) {}
