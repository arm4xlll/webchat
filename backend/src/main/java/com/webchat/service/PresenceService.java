package com.webchat.service;

import com.webchat.dto.response.PresenceResponse;
import com.webchat.dto.response.TypingResponse;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.sse.EventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
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
    private final EventPublisher eventPublisher;
    private final ConversationMemberRepository memberRepository;

    private static final Duration TYPING_TTL  = Duration.ofSeconds(5);
    // Focus heartbeat fires every 20s on the client; a 60s TTL tolerates two
    // missed/delayed beats (timer throttling, GC pauses, network spikes) so the
    // key never lapses while the user is actively viewing the chat.
    private static final Duration FOCUS_TTL   = Duration.ofSeconds(60);
    private static final String ONLINE_KEY    = "presence:online:";
    private static final String LASTSEEN_KEY  = "presence:lastseen:";
    private static final String FOCUS_KEY     = "presence:focus:";

    public void handleTyping(UUID conversationId, UUID userId, String username, boolean typing) {
        String key = "typing:" + conversationId + ":" + userId;
        try {
            if (typing) redisTemplate.opsForValue().set(key, username, TYPING_TTL);
            else        redisTemplate.delete(key);
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, typing not persisted for user={}", username);
        }
        eventPublisher.publishToConversation(
                conversationId,
                "conversation.typing",
                new TypingResponse(conversationId, userId, username, typing),
                userId
        );
    }

    @Transactional(readOnly = true)
    public void setOnline(UUID userId) {
        boolean redisOk = false;
        try {
            redisTemplate.opsForValue().set(ONLINE_KEY + userId, "1");
            redisOk = true;
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, online presence not set for user={}", userId);
        }
        if (redisOk) {
            broadcastPresence(userId, true, null);
        }
        log.debug("User online: {} redisOk={}", userId, redisOk);
    }

    @Transactional(readOnly = true)
    public void setOffline(UUID userId) {
        Instant now = Instant.now();
        boolean redisOk = false;
        try {
            redisTemplate.delete(ONLINE_KEY + userId);
            redisTemplate.opsForValue().set(LASTSEEN_KEY + userId, now.toString(), Duration.ofDays(30));
            redisOk = true;
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, offline presence not set for user={}", userId);
        }
        if (redisOk) {
            broadcastPresence(userId, false, now);
        }
        log.debug("User offline: {} redisOk={}", userId, redisOk);
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
    public void sendPresenceSnapshot(UUID requesterId) {
        List<PresenceResponse> snapshot = memberRepository.findContactIdsByUserId(requesterId)
                .stream()
                .map(contactId -> {
                    boolean online = isOnline(contactId);
                    Instant lastSeen = online ? null : getLastSeen(contactId);
                    return new PresenceResponse(contactId, online, lastSeen);
                })
                .toList();

        eventPublisher.publishToUser(requesterId, "presence.snapshot", snapshot);
        log.debug("[Presence] Sent snapshot ({} contacts) to user={}", snapshot.size(), requesterId);
    }

    public void setFocus(UUID userId, UUID conversationId) {
        try {
            if (conversationId != null) {
                redisTemplate.opsForValue().set(FOCUS_KEY + userId, conversationId.toString(), FOCUS_TTL);
            } else {
                redisTemplate.delete(FOCUS_KEY + userId);
            }
        } catch (RedisConnectionFailureException e) {
            log.warn("Redis unavailable, focus not updated for user={}", userId);
        }
    }

    public boolean isFocusedOn(UUID userId, UUID conversationId) {
        try {
            String val = redisTemplate.opsForValue().get(FOCUS_KEY + userId);
            return conversationId.toString().equals(val);
        } catch (RedisConnectionFailureException e) {
            return false;
        }
    }

    private void broadcastPresence(UUID userId, boolean online, Instant lastSeenAt) {
        PresenceResponse response = new PresenceResponse(userId, online, lastSeenAt);
        memberRepository.findConversationIdsByUserId(userId).forEach(convId ->
                eventPublisher.publishToConversation(convId, "presence.update", response)
        );
    }
}
