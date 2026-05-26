package com.webchat.service;

import com.webchat.dto.response.PresenceResponse;
import com.webchat.dto.response.TypingResponse;
import com.webchat.repository.ConversationMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PresenceService {

    private final StringRedisTemplate redisTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConversationMemberRepository memberRepository;

    private static final Duration TYPING_TTL = Duration.ofSeconds(5);
    private static final String ONLINE_KEY  = "presence:online:";
    private static final String LASTSEEN_KEY = "presence:lastseen:";

    public void handleTyping(UUID conversationId, UUID userId, String username, boolean typing) {
        String key = "typing:" + conversationId + ":" + userId;
        try {
            if (typing) redisTemplate.opsForValue().set(key, username, TYPING_TTL);
            else        redisTemplate.delete(key);
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, typing not persisted for user={}", username);
        }
        messagingTemplate.convertAndSend(
                "/topic/conversation." + conversationId + ".typing",
                new TypingResponse(conversationId, userId, username, typing)
        );
    }

    @Transactional(readOnly = true)
    public void setOnline(UUID userId) {
        try {
            redisTemplate.opsForValue().set(ONLINE_KEY + userId, "1");
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, online presence not set for user={}", userId);
        }
        broadcastPresence(userId, true, null);
        log.debug("User online: {}", userId);
    }

    @Transactional(readOnly = true)
    public void setOffline(UUID userId) {
        Instant now = Instant.now();
        try {
            redisTemplate.delete(ONLINE_KEY + userId);
            redisTemplate.opsForValue().set(LASTSEEN_KEY + userId, now.toString(), Duration.ofDays(30));
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, offline presence not set for user={}", userId);
        }
        broadcastPresence(userId, false, now);
        log.debug("User offline: {}", userId);
    }

    public boolean isOnline(UUID userId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(ONLINE_KEY + userId));
        } catch (RedisConnectionFailureException e) {
            return false;
        }
    }

    public Instant getLastSeen(UUID userId) {
        try {
            String val = redisTemplate.opsForValue().get(LASTSEEN_KEY + userId);
            return val != null ? Instant.parse(val) : null;
        } catch (RedisConnectionFailureException e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public void sendPresenceSnapshot(UUID requesterId, String requesterUsername) {
        // Прямой JPQL-запрос — без lazy loading цепочек
        List<PresenceResponse> snapshot = memberRepository.findContactIdsByUserId(requesterId)
                .stream()
                .map(contactId -> {
                    boolean online = isOnline(contactId);
                    Instant lastSeen = online ? null : getLastSeen(contactId);
                    return new PresenceResponse(contactId, online, lastSeen);
                })
                .toList();

        messagingTemplate.convertAndSendToUser(requesterUsername, "/queue/presence", snapshot);
        log.debug("[Presence] Sent snapshot ({} contacts) to {}", snapshot.size(), requesterUsername);
    }

    private void broadcastPresence(UUID userId, boolean online, Instant lastSeenAt) {
        PresenceResponse response = new PresenceResponse(userId, online, lastSeenAt);
        // Прямой запрос только conversation IDs — без lazy loading
        memberRepository.findConversationIdsByUserId(userId).forEach(convId ->
                messagingTemplate.convertAndSend(
                        "/topic/conversation." + convId + ".presence",
                        response
                )
        );
    }
}
