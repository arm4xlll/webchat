package com.webchat.controller;

import com.webchat.security.UserPrincipal;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/presence")
@RequiredArgsConstructor
public class PresenceController {

    private final PresenceService presenceService;

    @PostMapping("/sync")
    public ResponseEntity<Void> sync(@AuthenticationPrincipal UserPrincipal principal) {
        presenceService.sendPresenceSnapshot(principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
