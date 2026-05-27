package com.webchat.controller;

import com.webchat.dto.request.PinRequest;
import com.webchat.dto.response.PinnedMessageResponse;
import com.webchat.security.UserPrincipal;
import com.webchat.service.PinService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations/{convId}/pins")
@RequiredArgsConstructor
public class PinController {

    private final PinService pinService;

    @GetMapping
    public ResponseEntity<List<PinnedMessageResponse>> getPins(
            @PathVariable UUID convId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(pinService.getPins(convId, principal.getUserId()));
    }

    @PostMapping
    public ResponseEntity<PinnedMessageResponse> pin(
            @PathVariable UUID convId,
            @RequestBody PinRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(
                pinService.pin(convId, principal.getUserId(), request.messageId(), request.pinnedForAll())
        );
    }

    @DeleteMapping("/{pinId}")
    public ResponseEntity<Void> unpin(
            @PathVariable UUID convId,
            @PathVariable UUID pinId,
            @AuthenticationPrincipal UserPrincipal principal) {
        pinService.unpin(convId, principal.getUserId(), pinId);
        return ResponseEntity.noContent().build();
    }
}
