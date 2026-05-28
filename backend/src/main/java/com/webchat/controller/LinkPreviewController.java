package com.webchat.controller;

import com.webchat.dto.response.LinkPreviewResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.LinkPreviewService;
import com.webchat.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/meta")
@RequiredArgsConstructor
public class LinkPreviewController {

    private final LinkPreviewService linkPreviewService;
    private final RateLimitService rateLimitService;

    @GetMapping
    public ResponseEntity<LinkPreviewResponse> preview(@RequestParam String url,
                                                        @AuthenticationPrincipal UserPrincipal principal) {
        if (!rateLimitService.isAllowed(principal.getUserId(), "link-preview", 30, Duration.ofMinutes(1))) {
            return ResponseEntity.status(429).build();
        }
        return linkPreviewService.getPreview(url)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
