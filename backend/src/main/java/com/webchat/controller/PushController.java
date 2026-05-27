package com.webchat.controller;

import com.webchat.dto.request.SubscribeRequest;
import com.webchat.model.PushSubscription;
import com.webchat.model.User;
import com.webchat.repository.PushSubscriptionRepository;
import com.webchat.security.UserPrincipal;
import com.webchat.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
@Slf4j
public class PushController {

    @Value("${vapid.public-key}")
    private String publicKey;

    private final PushSubscriptionRepository repository;
    private final UserService userService;

    @GetMapping("/public-key")
    public ResponseEntity<?> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", publicKey));
    }

    /**
     * Register (or refresh) a browser push subscription.
     *
     * Two independent repository calls — each runs in its own transaction
     * (both are @Transactional at the repository level). This avoids the
     * "rollback-only poisoning" bug that happened when deleteByEndpoint
     * was called inside a try/catch within an outer @Transactional context:
     * Spring marked the TX rollback-only before the exception could be caught,
     * then the subsequent save() threw UnexpectedRollbackException → 500.
     */
    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                       @RequestBody SubscribeRequest request) {
        if (request.endpoint() == null || request.p256dh() == null || request.auth() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "endpoint, p256dh and auth are required"));
        }

        User user = userService.getEntityById(userPrincipal.getUserId());

        // TX 1: remove stale subscription (JPQL bulk delete, own transaction)
        repository.deleteByEndpoint(request.endpoint());

        // TX 2: insert the new subscription (own transaction)
        repository.save(PushSubscription.builder()
                .user(user)
                .endpoint(request.endpoint())
                .p256dh(request.p256dh())
                .auth(request.auth())
                .build());

        log.debug("Push subscription saved for user={}", userPrincipal.getUserId());
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @DeleteMapping("/unsubscribe")
    public ResponseEntity<?> unsubscribe(@RequestParam String endpoint) {
        repository.deleteByEndpoint(endpoint);
        return ResponseEntity.ok(Map.of("status", "unsubscribed"));
    }
}
