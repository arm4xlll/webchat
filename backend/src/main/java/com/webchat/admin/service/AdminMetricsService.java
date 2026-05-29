package com.webchat.admin.service;

import com.webchat.admin.dto.*;
import com.webchat.admin.metrics.HttpMetricsInterceptor;
import com.webchat.admin.metrics.SystemMetricsCollector;
import com.webchat.repository.MessageRepository;
import com.webchat.repository.SessionRepository;
import com.webchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

@Service
@RequiredArgsConstructor
public class AdminMetricsService {

    private final SystemMetricsCollector systemCollector;
    private final HttpMetricsInterceptor httpInterceptor;
    private final UserRepository         userRepository;
    private final SessionRepository      sessionRepository;
    private final MessageRepository      messageRepository;

    private static final int MAX_HISTORY   = 720; // 1 hour at 5s intervals
    private static final int INTERVAL_SEC  = 5;

    private final Deque<AdminMetricsSnapshot> history = new ConcurrentLinkedDeque<>();

    public AdminMetricsSnapshot snapshot() {
        long[] pcts   = httpInterceptor.percentiles();
        long   total  = httpInterceptor.drainTotal();
        long   c2xx   = httpInterceptor.drain2xx();
        long   c4xx   = httpInterceptor.drain4xx();
        long   c5xx   = httpInterceptor.drain5xx();

        Instant now  = Instant.now();
        long msgMin  = messageRepository.countSince(now.minusSeconds(60));
        long msgDay  = messageRepository.countTodayMessages(now.truncatedTo(ChronoUnit.DAYS));
        long dau     = sessionRepository.countDistinctActiveUsersSince(now.minus(24, ChronoUnit.HOURS));

        AdminMetricsSnapshot snap = AdminMetricsSnapshot.builder()
                .timestamp(now.toEpochMilli())
                .system(systemCollector.collect())
                .http(HttpStatsDto.builder()
                        .rps((double) total / INTERVAL_SEC)
                        .p50Ms(pcts[0])
                        .p95Ms(pcts[1])
                        .p99Ms(pcts[2])
                        .count2xx(c2xx)
                        .count4xx(c4xx)
                        .count5xx(c5xx)
                        .totalRequests(total)
                        .build())
                .business(BusinessMetricsDto.builder()
                        .totalUsers(userRepository.count())
                        .dailyActiveUsers(dau)
                        .messagesLastMinute(msgMin)
                        .messagesPerSecond((double) msgMin / 60)
                        .messagesToday(msgDay)
                        .build())
                .build();

        history.addLast(snap);
        while (history.size() > MAX_HISTORY) history.pollFirst();

        return snap;
    }

    public List<AdminMetricsSnapshot> history(int rangeSeconds) {
        long cutoff = Instant.now().minusSeconds(rangeSeconds).toEpochMilli();
        List<AdminMetricsSnapshot> result = new ArrayList<>();
        for (AdminMetricsSnapshot s : history) {
            if (s.getTimestamp() >= cutoff) result.add(s);
        }
        return result;
    }
}
