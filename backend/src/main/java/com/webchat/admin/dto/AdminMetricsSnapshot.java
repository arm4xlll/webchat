package com.webchat.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminMetricsSnapshot {
    private long             timestamp;
    private SystemHealthDto  system;
    private HttpStatsDto     http;
    private BusinessMetricsDto business;
}
