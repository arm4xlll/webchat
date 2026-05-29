package com.webchat.admin.controller;

import com.webchat.admin.dto.AdminMetricsSnapshot;
import com.webchat.admin.dto.ErrorEntryDto;
import com.webchat.admin.metrics.ErrorLogBuffer;
import com.webchat.admin.service.AdminMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
@RequestMapping("/api/admin/metrics")
@RequiredArgsConstructor
@Slf4j
public class AdminMetricsController {

    private final AdminMetricsService metricsService;
    private final ErrorLogBuffer      errorLogBuffer;

    private final List<SseEmitter> adminEmitters = new CopyOnWriteArrayList<>();

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(HttpServletResponse response) {
        response.setHeader("X-Accel-Buffering", "no");
        response.setHeader("Cache-Control", "no-cache");

        SseEmitter emitter = new SseEmitter(0L);
        adminEmitters.add(emitter);

        Runnable cleanup = () -> adminEmitters.remove(emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(emitter::complete);
        emitter.onError(t -> cleanup.run());

        // Send first snapshot immediately on connect
        try {
            push(emitter, metricsService.snapshot());
        } catch (IOException e) {
            adminEmitters.remove(emitter);
        }

        return emitter;
    }

    @GetMapping("/history")
    public List<AdminMetricsSnapshot> history(
            @RequestParam(defaultValue = "3600") int rangeSeconds) {
        return metricsService.history(rangeSeconds);
    }

    @GetMapping("/errors")
    public List<ErrorEntryDto> errors(@RequestParam(defaultValue = "50") int limit) {
        return errorLogBuffer.getLast(limit);
    }

    @Scheduled(fixedRate = 1000)
    public void pushToAll() {
        if (adminEmitters.isEmpty()) return;

        AdminMetricsSnapshot snap = metricsService.snapshot();
        List<SseEmitter> dead = new ArrayList<>();

        for (SseEmitter emitter : adminEmitters) {
            try {
                push(emitter, snap);
            } catch (IOException e) {
                dead.add(emitter);
            }
        }
        adminEmitters.removeAll(dead);
    }

    private void push(SseEmitter emitter, AdminMetricsSnapshot snap) throws IOException {
        emitter.send(SseEmitter.event()
                .name("metrics")
                .data(snap, MediaType.APPLICATION_JSON));
    }
}
