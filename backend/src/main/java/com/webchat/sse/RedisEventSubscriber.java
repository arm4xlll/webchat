package com.webchat.sse;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class RedisEventSubscriber implements MessageListener {

    private final SseEmitterRegistry registry;
    private final ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String body = new String(message.getBody(), StandardCharsets.UTF_8);
        try {
            JsonNode root = objectMapper.readTree(body);
            String type = root.path("type").asText();
            JsonNode data = root.path("data");

            List<UUID> recipients = new ArrayList<>();
            for (JsonNode id : root.path("recipients")) {
                recipients.add(UUID.fromString(id.asText()));
            }

            for (UUID userId : recipients) {
                dispatch(userId, type, data);
            }
        } catch (Exception e) {
            log.error("Failed to dispatch SSE event: {}", body, e);
        }
    }

    private void dispatch(UUID userId, String type, JsonNode data) {
        for (SseEmitter emitter : registry.forUser(userId)) {
            try {
                emitter.send(SseEmitter.event()
                        .name(type)
                        .data(data, org.springframework.http.MediaType.APPLICATION_JSON));
            } catch (IOException e) {
                log.debug("SSE send failed for user={} type={} — completing emitter", userId, type);
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                }
            } catch (IllegalStateException e) {
                log.debug("SSE emitter already completed for user={} type={}", userId, type);
            }
        }
    }
}
