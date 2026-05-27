package com.webchat.controller;

import com.webchat.dto.request.RenameSessionRequest;
import com.webchat.dto.response.SessionResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.SessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sessions")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;

    @GetMapping
    public ResponseEntity<List<SessionResponse>> getSessions(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                sessionService.getSessions(principal.getUserId(), principal.getSessionId()));
    }

    @PutMapping("/{sessionId}/label")
    public ResponseEntity<SessionResponse> renameSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId,
            @RequestBody RenameSessionRequest request) {
        return ResponseEntity.ok(
                sessionService.renameSession(principal.getUserId(), sessionId, request.label()));
    }

    @DeleteMapping("/{sessionId}")
    public ResponseEntity<Void> revokeSession(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID sessionId) {
        sessionService.revokeSession(
                principal.getUserId(), principal.getSessionId(), sessionId);
        return ResponseEntity.noContent().build();
    }
}
