package com.webchat.sse;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.webchat.repository.ConversationMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    public static final String CHANNEL = "webchat:events";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ConversationMemberRepository memberRepository;

    public void publishToUser(UUID userId, String type, Object data) {
        publish(new SseEvent(List.of(userId), type, data));
    }

    public void publishToUsers(List<UUID> userIds, String type, Object data) {
        if (userIds.isEmpty()) return;
        publish(new SseEvent(userIds, type, data));
    }

    public void publishToConversation(UUID conversationId, String type, Object data) {
        publishToConversation(conversationId, type, data, null);
    }

    public void publishToConversation(UUID conversationId, String type, Object data, UUID excludeUserId) {
        List<UUID> members = memberRepository.findAllByConversationId(conversationId).stream()
                .map(m -> m.getUser().getId())
                .filter(id -> excludeUserId == null || !id.equals(excludeUserId))
                .toList();
        if (members.isEmpty()) return;
        publish(new SseEvent(new ArrayList<>(members), type, data));
    }

    private void publish(SseEvent event) {
        try {
            String json = objectMapper.writeValueAsString(event);
            redisTemplate.convertAndSend(CHANNEL, json);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize SSE event type={}", event.type(), e);
        }
    }
}
