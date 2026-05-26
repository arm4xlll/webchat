package com.webchat.service;

import com.webchat.dto.response.TypingResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;

    private static final Duration TYPING_TTL = Duration.ofSeconds(5);

    public void handleTyping(UUID conversationId, UUID userId, String username, boolean typing) {
        String key = "typing:" + conversationId + ":" + userId;

        try {
            if (typing) {
                redisTemplate.opsForValue().set(key, username, TYPING_TTL);
            } else {
                redisTemplate.delete(key);
            }
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, typing state not persisted for user={}", username);
        }

        TypingResponse response = new TypingResponse(conversationId, userId, username, typing);
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".typing",
                response
        );
    }
}
