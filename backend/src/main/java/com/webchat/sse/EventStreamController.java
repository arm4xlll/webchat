package com.webchat.sse;

import com.webchat.security.UserPrincipal;
import com.webchat.service.PresenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Slf4j
public class EventStreamController {

    private final SseEmitterRegistry registry;
    private final PresenceService presenceService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal UserPrincipal principal,
                             HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        UUID userId = principal.getUserId();
        SseEmitter emitter = new SseEmitter(0L); // 0L = no timeout

        boolean firstTab = registry.register(userId, emitter);

        emitter.onCompletion(() ->
                registry.unregister(userId, emitter, presenceService::setOffline));
        emitter.onTimeout(() -> {
            log.debug("SSE timeout user={}", userId);
            emitter.complete();
        });
        emitter.onError(t -> {
            log.debug("SSE error user={}: {}", userId, t.toString());
            registry.unregister(userId, emitter, presenceService::setOffline);
        });

        try {
            emitter.send(SseEmitter.event()
                    .name("stream.ready")
                    .data(Map.of("userId", userId.toString()), MediaType.APPLICATION_JSON));
        } catch (IOException e) {
            log.warn("Failed to send stream.ready for user={}", userId);
        }

        if (firstTab) {
            presenceService.setOnline(userId);
        }
        presenceService.sendPresenceSnapshot(userId);

        log.info("SSE stream opened: user={} username={}", userId, principal.getUsername());
        return emitter;
    }
}
