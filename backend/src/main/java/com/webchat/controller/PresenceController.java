package com.webchat.controller;

import com.webchat.security.UserPrincipal;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

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

    @PostMapping("/focus")
    public ResponseEntity<Void> focus(@AuthenticationPrincipal UserPrincipal principal,
                                      @RequestBody Map<String, String> body) {
        String raw = body.get("conversationId");
        UUID conversationId = (raw != null && !raw.isBlank()) ? UUID.fromString(raw) : null;
        presenceService.setFocus(principal.getUserId(), conversationId);
        return ResponseEntity.noContent().build();
    }
}
