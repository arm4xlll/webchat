package com.webchat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RateLimitService {

    private final StringRedisTemplate redis;

    /**
     * Fixed-window counter per userId+action backed by Redis.
     * Fail-open: if Redis is unavailable, the request is allowed through.
     *
     * @return true if request is allowed, false if limit exceeded
     */
    public boolean isAllowed(UUID userId, String action, int maxRequests, Duration window) {
        String key = "rl:" + action + ":" + userId;
        try {
            Long count = redis.opsForValue().increment(key);
            if (count == null) return true;
            if (count == 1) {
                redis.expire(key, window);
            }
            return count <= maxRequests;
        } catch (Exception e) {
            log.debug("Rate limit Redis error userId={} action={}: {}", userId, action, e.getMessage());
            return true;
        }
    }
}
