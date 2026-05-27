package com.webchat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateSettingsRequest(
        @NotBlank @Size(max = 50) String themeId,
        @NotBlank @Pattern(regexp = "small|medium|large") String fontSize
) {}
