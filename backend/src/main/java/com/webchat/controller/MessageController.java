package com.webchat.controller;

import com.webchat.dto.request.ReactRequest;
import com.webchat.security.UserPrincipal;
import com.webchat.service.ReactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final ReactionService reactionService;

    @PostMapping("/{id}/reactions")
    public ResponseEntity<Void> toggleReaction(
            @PathVariable UUID id,
            @Valid @RequestBody ReactRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        reactionService.toggleReaction(principal.getUserId(), id, request.emoji());
        return ResponseEntity.noContent().build();
    }
}
