package com.webchat.call;

import com.webchat.call.dto.*;
import com.webchat.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @PostMapping("/invite")
    public ResponseEntity<CallTokenResponse> invite(
            @Valid @RequestBody CallInviteRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(callService.invite(req.conversationId(), principal.getUserId()));
    }

    @PostMapping("/answer")
    public ResponseEntity<CallTokenResponse> answer(
            @Valid @RequestBody CallAnswerRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        CallTokenResponse resp = callService.answer(req.conversationId(), principal.getUserId(), req.accepted());
        return resp != null ? ResponseEntity.ok(resp) : ResponseEntity.noContent().build();
    }

    @PostMapping("/end")
    public ResponseEntity<Void> end(
            @Valid @RequestBody CallEndRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        callService.end(req.conversationId(), principal.getUserId());
        return ResponseEntity.noContent().build();
    }
}
