package com.webchat.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemHealthDto {
    private double cpuProcessPercent;
    private double cpuSystemPercent;
    private long   heapUsedMb;
    private long   heapMaxMb;
    private long   nonHeapUsedMb;
    private long   totalPhysicalMemoryMb;
    private long   freePhysicalMemoryMb;
    private int    activeSseConnections;
    private int    threadCount;
    private long   uptimeSeconds;
}
