package com.webchat.controller;

import com.webchat.dto.request.CreateConversationRequest;
import com.webchat.dto.request.EditMessageRequest;
import com.webchat.dto.response.ConversationResponse;
import com.webchat.dto.response.MessageResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.ConversationService;
import com.webchat.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
@Slf4j
public class ConversationController {

    private final ConversationService conversationService;
    private final MessageService messageService;

    @GetMapping
    public ResponseEntity<List<ConversationResponse>> list(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(conversationService.getForUser(principal.getUserId()));
    }

    @PostMapping
    public ResponseEntity<ConversationResponse> createOrGet(
            @Valid @RequestBody CreateConversationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                conversationService.getOrCreateDirect(principal.getUserId(), request.targetUserId())
        );
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageResponse>> messages(
            @PathVariable UUID id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(messageService.getHistory(id, principal.getUserId(), page, size));
    }

    @GetMapping("/{id}/messages/after")
    public ResponseEntity<List<MessageResponse>> messagesAfter(
            @PathVariable UUID id,
            @RequestParam Instant after,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(messageService.getAfter(id, principal.getUserId(), after));
    }

    @PatchMapping("/{convId}/messages/{msgId}")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable UUID convId,
            @PathVariable UUID msgId,
            @Valid @RequestBody EditMessageRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(messageService.editMessage(principal.getUserId(), msgId, request.content()));
    }

    @DeleteMapping("/{convId}/messages/{msgId}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable UUID convId,
            @PathVariable UUID msgId,
            @RequestParam(defaultValue = "false") boolean forEveryone,
            @AuthenticationPrincipal UserPrincipal principal) {
        messageService.deleteMessage(principal.getUserId(), msgId, forEveryone);
        return ResponseEntity.noContent().build();
    }
}
