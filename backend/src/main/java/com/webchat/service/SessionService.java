package com.webchat.service;

import com.webchat.dto.response.SessionResponse;
import com.webchat.model.Session;
import com.webchat.model.User;
import com.webchat.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
public class SessionService {

    private final SessionRepository sessionRepository;
    private final StringRedisTemplate redis;

    @Value("${app.jwt.access-token-expiration}")
    private long accessTokenExpirationMs;

    // ── Create ──────────────────────────────────────────────────────────────

    @Transactional
    public Session createSession(User user, String userAgent, String ipAddress) {
        boolean isPrimary = sessionRepository.countActiveByUserId(user.getId()) == 0;
        Session session = Session.builder()
                .user(user)
                .userAgent(userAgent)
                .ipAddress(ipAddress)
                .primary(isPrimary)
                .build();
        Session saved = sessionRepository.save(session);
        log.info("Session created for user {} (primary={}): {}", user.getUsername(), isPrimary, saved.getId());
        return saved;
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<SessionResponse> getSessions(UUID userId, UUID currentSessionId) {
        return sessionRepository.findActiveByUserId(userId).stream()
                .map(s -> toResponse(s, currentSessionId))
                .toList();
    }

    // ── Update ───────────────────────────────────────────────────────────────

    @Transactional
    public SessionResponse renameSession(UUID userId, UUID sessionId, String label) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (!session.getUser().getId().equals(userId)) {
            throw new SecurityException("Access denied");
        }
        if (session.getRevokedAt() != null) {
            throw new IllegalArgumentException("Session is no longer active");
        }
        String trimmed = label != null ? label.strip() : null;
        session.setLabel((trimmed == null || trimmed.isEmpty()) ? null : trimmed);
        return toResponse(sessionRepository.save(session), sessionId);
    }

    // ── Revoke (kick) ─────────────────────────────────────────────────────────

    @Transactional
    public void revokeSession(UUID requestingUserId, UUID requestingSessionId, UUID targetSessionId) {
        Session target = sessionRepository.findById(targetSessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        if (!target.getUser().getId().equals(requestingUserId)) {
            throw new SecurityException("Access denied");
        }
        if (target.getRevokedAt() != null) {
            return; // idempotent — already revoked
        }
        if (targetSessionId.equals(requestingSessionId)) {
            throw new IllegalArgumentException("Cannot revoke current session — use logout instead");
        }

        // Primary session protection: only another primary (or self) can revoke primary
        if (target.isPrimary()) {
            boolean requestingIsPrimary = requestingSessionId != null &&
                    sessionRepository.findById(requestingSessionId)
                            .map(Session::isPrimary)
                            .orElse(false);
            if (!requestingIsPrimary) {
                throw new SecurityException("Only the primary session can revoke the primary session");
            }
        }

        target.setRevokedAt(Instant.now());
        sessionRepository.save(target);
        addToRevokedList(targetSessionId);
        log.info("Session {} revoked by session {}", targetSessionId, requestingSessionId);
    }

    /** Called on logout — revokes the caller's own session. */
    @Transactional
    public void logoutSession(UUID sessionId) {
        if (sessionId == null) return;
        sessionRepository.findById(sessionId).ifPresent(session -> {
            if (session.getRevokedAt() == null) {
                session.setRevokedAt(Instant.now());
                sessionRepository.save(session);
                addToRevokedList(sessionId);
                log.info("Session logged out: {}", sessionId);
            }
        });
    }

    // ── Revocation check & heartbeat ─────────────────────────────────────────

    public boolean isRevoked(UUID sessionId) {
        try {
            return Boolean.TRUE.equals(redis.hasKey(revokedKey(sessionId)));
        } catch (Exception e) {
            log.warn("Redis error checking session revocation, allowing through: {}", e.getMessage());
            return false;
        }
    }

    public void updateHeartbeat(UUID sessionId) {
        try {
            Boolean isNew = redis.opsForValue()
                    .setIfAbsent(heartbeatKey(sessionId), "1", Duration.ofMinutes(5));
            if (Boolean.TRUE.equals(isNew)) {
                sessionRepository.updateLastActiveAt(sessionId, Instant.now());
            }
        } catch (Exception e) {
            log.debug("Redis heartbeat error: {}", e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void addToRevokedList(UUID sessionId) {
        try {
            long ttlSeconds = accessTokenExpirationMs / 1000 + 60;
            redis.opsForValue().set(revokedKey(sessionId), "1", Duration.ofSeconds(ttlSeconds));
        } catch (Exception e) {
            log.warn("Redis error adding session to revoked list: {}", e.getMessage());
        }
    }

    private String revokedKey(UUID sessionId) {
        return "session:revoked:" + sessionId;
    }

    private String heartbeatKey(UUID sessionId) {
        return "session:hb:" + sessionId;
    }

    private SessionResponse toResponse(Session s, UUID currentSessionId) {
        return new SessionResponse(
                s.getId(),
                s.getLabel(),
                s.getUserAgent(),
                s.getIpAddress(),
                s.getCreatedAt(),
                s.getLastActiveAt(),
                s.isPrimary(),
                s.getId().equals(currentSessionId)
        );
    }
}
