package com.webchat.admin.metrics;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.atomic.LongAdder;

@Component
public class HttpMetricsInterceptor implements HandlerInterceptor {

    private static final String ATTR_START = "req_start_ns";

    public final LongAdder totalRequests = new LongAdder();
    public final LongAdder status2xx     = new LongAdder();
    public final LongAdder status4xx     = new LongAdder();
    public final LongAdder status5xx     = new LongAdder();

    private final LatencyRingBuffer latency = new LatencyRingBuffer(10_000);

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        req.setAttribute(ATTR_START, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest req, HttpServletResponse res,
                                Object handler, Exception ex) {
        Long start = (Long) req.getAttribute(ATTR_START);
        if (start == null) return;

        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        latency.record(elapsedMs);
        totalRequests.increment();

        int status = res.getStatus();
        if      (status < 400) status2xx.increment();
        else if (status < 500) status4xx.increment();
        else                   status5xx.increment();
    }

    public long[] percentiles() {
        return latency.percentiles(50, 95, 99);
    }

    public long drainTotal() {
        return totalRequests.sumThenReset();
    }

    public long drain2xx() { return status2xx.sumThenReset(); }
    public long drain4xx() { return status4xx.sumThenReset(); }
    public long drain5xx() { return status5xx.sumThenReset(); }
}
