package com.webchat.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HttpStatsDto {
    private double rps;
    private long   p50Ms;
    private long   p95Ms;
    private long   p99Ms;
    private long   count2xx;
    private long   count4xx;
    private long   count5xx;
    private long   totalRequests;
}
