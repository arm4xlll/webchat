package com.webchat.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.webchat.model.PushSubscription;
import com.webchat.repository.PushSubscriptionRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.security.Security;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    @Value("${vapid.public-key}")
    private String publicKey;

    @Value("${vapid.private-key}")
    private String privateKey;

    @Value("${vapid.subject}")
    private String subject;

    private final PushSubscriptionRepository subscriptionRepository;
    private final ObjectMapper objectMapper;
    private PushService pushService;

    @PostConstruct
    public void init() {
        try {
            if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
                Security.addProvider(new BouncyCastleProvider());
            }
            pushService = new PushService(publicKey, privateKey, subject);
        } catch (Exception e) {
            log.error("Failed to initialize PushService", e);
        }
    }

    @Async
    public void sendPushToUser(UUID userId, String title, String body, Map<String, Object> data) {
        if (pushService == null) return;

        List<PushSubscription> subs = subscriptionRepository.findByUserId(userId);
        if (subs.isEmpty()) return;

        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "title", title,
                    "body", body,
                    "data", data != null ? data : Map.of()
            ));

            for (PushSubscription sub : subs) {
                try {
                    Notification notification = new Notification(
                            sub.getEndpoint(),
                            sub.getP256dh(),
                            sub.getAuth(),
                            payload
                    );
                    pushService.send(notification);
                } catch (Exception e) {
                    log.warn("Push send failed endpoint={} error={}", sub.getEndpoint(), e.getMessage());
                    try {
                        subscriptionRepository.deleteByEndpoint(sub.getEndpoint());
                    } catch (Exception deleteEx) {
                        log.error("Failed to remove dead push subscription endpoint={}: {}",
                                sub.getEndpoint(), deleteEx.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to serialize push payload", e);
        }
    }
}
