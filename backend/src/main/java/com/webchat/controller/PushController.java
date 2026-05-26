package com.webchat.controller;

import com.webchat.dto.request.SubscribeRequest;
import com.webchat.model.PushSubscription;
import com.webchat.model.User;
import com.webchat.repository.PushSubscriptionRepository;
import com.webchat.security.UserPrincipal;
import com.webchat.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    @Value("${vapid.public-key}")
    private String publicKey;

    private final PushSubscriptionRepository repository;
    private final UserService userService;

    @GetMapping("/public-key")
    public ResponseEntity<?> getPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", publicKey));
    }

    @PostMapping("/subscribe")
    @Transactional
    public ResponseEntity<?> subscribe(@AuthenticationPrincipal UserPrincipal userPrincipal,
                                       @RequestBody SubscribeRequest request) {
        User user = userService.getEntityById(userPrincipal.getUserId());

        try {
            repository.deleteByEndpoint(request.endpoint());
        } catch(Exception ignored){}

        PushSubscription sub = PushSubscription.builder()
                .user(user)
                .endpoint(request.endpoint())
                .p256dh(request.p256dh())
                .auth(request.auth())
                .build();
        repository.save(sub);
        return ResponseEntity.ok(Map.of("status", "subscribed"));
    }

    @DeleteMapping("/unsubscribe")
    @Transactional
    public ResponseEntity<?> unsubscribe(@RequestParam String endpoint) {
        repository.deleteByEndpoint(endpoint);
        return ResponseEntity.ok(Map.of("status", "unsubscribed"));
    }
}
