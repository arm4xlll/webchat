package com.webchat.sse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class SseHeartbeat {

    private final SseEmitterRegistry registry;

    @Scheduled(fixedRate = 15000)
    public void tick() {
        for (UUID userId : registry.connectedUserIds()) {
            for (SseEmitter emitter : registry.forUser(userId)) {
                try {
                    emitter.send(SseEmitter.event().comment("hb"));
                } catch (IOException e) {
                    log.debug("Heartbeat failed for user={} — completing emitter", userId);
                    try {
                        emitter.completeWithError(e);
                    } catch (Exception ignored) {
                    }
                } catch (IllegalStateException ignored) {
                }
            }
        }
    }
}
