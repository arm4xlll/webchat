package com.webchat.admin.metrics;

import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Lock-free fixed-size circular buffer for latency samples.
 * Slight inaccuracy under concurrent access is acceptable for monitoring.
 */
public class LatencyRingBuffer {

    private final long[] buffer;
    private final int capacity;
    private final AtomicInteger writeIdx = new AtomicInteger(0);
    private final AtomicInteger count    = new AtomicInteger(0);

    public LatencyRingBuffer(int capacity) {
        this.capacity = capacity;
        this.buffer   = new long[capacity];
    }

    public void record(long ms) {
        int idx = Math.abs(writeIdx.getAndIncrement() % capacity);
        buffer[idx] = ms;
        if (count.get() < capacity) count.incrementAndGet();
    }

    /** Returns [p50, p95, p99] in ms, or zeros if no data. */
    public long[] percentiles(int... pcts) {
        int n = Math.min(count.get(), capacity);
        long[] result = new long[pcts.length];
        if (n == 0) return result;

        long[] snapshot = Arrays.copyOf(buffer, n);
        Arrays.sort(snapshot);
        for (int i = 0; i < pcts.length; i++) {
            int idx = (int) Math.ceil(pcts[i] / 100.0 * n) - 1;
            result[i] = snapshot[Math.max(0, Math.min(idx, n - 1))];
        }
        return result;
    }
}
