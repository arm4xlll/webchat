package com.webchat.sse;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

@Component
@Slf4j
public class SseEmitterRegistry {

    private final Map<UUID, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sse-offline-grace");
        t.setDaemon(true);
        return t;
    });

    private static final long OFFLINE_GRACE_SECONDS = 5;

    public boolean register(UUID userId, SseEmitter emitter) {
        Set<SseEmitter> set = emitters.computeIfAbsent(userId, k -> new CopyOnWriteArraySet<>());
        boolean first = set.isEmpty();
        set.add(emitter);
        log.debug("SSE register user={} totalEmitters={} firstTab={}", userId, set.size(), first);
        return first;
    }

    public void unregister(UUID userId, SseEmitter emitter, Consumer<UUID> onAllDisconnected) {
        Set<SseEmitter> set = emitters.get(userId);
        if (set == null) return;
        set.remove(emitter);
        log.debug("SSE unregister user={} remaining={}", userId, set.size());
        if (set.isEmpty()) {
            emitters.remove(userId);
            scheduler.schedule(() -> {
                if (!emitters.containsKey(userId)) {
                    onAllDisconnected.accept(userId);
                }
            }, OFFLINE_GRACE_SECONDS, TimeUnit.SECONDS);
        }
    }

    public Collection<SseEmitter> forUser(UUID userId) {
        Set<SseEmitter> set = emitters.get(userId);
        return set == null ? Collections.emptySet() : set;
    }

    public boolean isOnline(UUID userId) {
        Set<SseEmitter> set = emitters.get(userId);
        return set != null && !set.isEmpty();
    }

    public Set<UUID> connectedUserIds() {
        return emitters.keySet();
    }
}
