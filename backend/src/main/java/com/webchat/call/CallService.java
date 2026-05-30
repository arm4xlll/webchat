package com.webchat.call;

import com.webchat.call.dto.*;
import com.webchat.model.ConversationMember;
import com.webchat.model.User;
import com.webchat.repository.ConversationMemberRepository;
import com.webchat.repository.UserRepository;
import com.webchat.sse.EventPublisher;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CallService {

    private final ConversationMemberRepository memberRepository;
    private final UserRepository userRepository;
    private final EventPublisher eventPublisher;

    @Value("${livekit.url}")
    private String livekitUrl;

    @Value("${livekit.api-key}")
    private String apiKey;

    @Value("${livekit.api-secret}")
    private String apiSecret;

    public CallTokenResponse invite(UUID conversationId, UUID callerId) {
        List<ConversationMember> members = requireMembers(conversationId, callerId);

        UUID calleeId = members.stream()
                .map(m -> m.getUser().getId())
                .filter(id -> !id.equals(callerId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No other member"));

        User caller = userRepository.findById(callerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Caller not found"));

        String token = generateToken(conversationId, caller.getName());

        eventPublisher.publishToUser(calleeId, "call.incoming",
                new CallIncomingEvent(conversationId, callerId, caller.getName(), caller.getAvatarUrl()));

        return new CallTokenResponse(token, livekitUrl, conversationId);
    }

    public CallTokenResponse answer(UUID conversationId, UUID calleeId, boolean accepted) {
        List<ConversationMember> members = requireMembers(conversationId, calleeId);

        UUID callerId = members.stream()
                .map(m -> m.getUser().getId())
                .filter(id -> !id.equals(calleeId))
                .findFirst()
                .orElseThrow();

        eventPublisher.publishToUser(callerId, "call.answered",
                new CallAnsweredEvent(conversationId, accepted));

        if (!accepted) return null;

        User callee = userRepository.findById(calleeId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Callee not found"));

        String token = generateToken(conversationId, callee.getName());
        return new CallTokenResponse(token, livekitUrl, conversationId);
    }

    public void end(UUID conversationId, UUID userId) {
        List<ConversationMember> members = requireMembers(conversationId, userId);
        List<UUID> memberIds = new ArrayList<>(members.stream().map(m -> m.getUser().getId()).toList());
        eventPublisher.publishToUsers(memberIds, "call.ended", new CallEndedEvent(conversationId));
    }

    private List<ConversationMember> requireMembers(UUID conversationId, UUID userId) {
        List<ConversationMember> members = memberRepository.findAllByConversationId(conversationId);
        boolean isMember = members.stream().anyMatch(m -> m.getUser().getId().equals(userId));
        if (!isMember) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member");
        return members;
    }

    private String generateToken(UUID conversationId, String participantName) {
        // LiveKit uses HS256 JWT signed with the api-secret; key must be >= 32 bytes
        byte[] keyBytes = Arrays.copyOf(apiSecret.getBytes(StandardCharsets.UTF_8), 32);
        SecretKey key = Keys.hmacShaKeyFor(keyBytes);

        Map<String, Object> videoGrants = new LinkedHashMap<>();
        videoGrants.put("roomJoin", true);
        videoGrants.put("room", "call_" + conversationId);
        videoGrants.put("canPublish", true);
        videoGrants.put("canSubscribe", true);
        videoGrants.put("canPublishSources", List.of("microphone"));

        return Jwts.builder()
                .issuer(apiKey)
                .subject(participantName)
                .id(UUID.randomUUID().toString())
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .notBefore(Date.from(Instant.now()))
                .claim("video", videoGrants)
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }
}
