package com.webchat.admin.metrics;

import com.sun.management.OperatingSystemMXBean;
import com.webchat.admin.dto.SystemHealthDto;
import com.webchat.sse.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;

@Component
@RequiredArgsConstructor
public class SystemMetricsCollector {

    private final SseEmitterRegistry sseRegistry;

    private static final OperatingSystemMXBean OS_BEAN =
            ManagementFactory.getPlatformMXBean(OperatingSystemMXBean.class);
    private static final MemoryMXBean MEM_BEAN =
            ManagementFactory.getMemoryMXBean();

    public SystemHealthDto collect() {
        long heapUsed  = MEM_BEAN.getHeapMemoryUsage().getUsed();
        long heapMax   = MEM_BEAN.getHeapMemoryUsage().getMax();
        long nonHeap   = MEM_BEAN.getNonHeapMemoryUsage().getUsed();

        double cpuProcess = OS_BEAN.getProcessCpuLoad() * 100;
        double cpuSystem  = OS_BEAN.getCpuLoad() * 100;

        return SystemHealthDto.builder()
                .cpuProcessPercent(cpuProcess < 0 ? 0 : cpuProcess)
                .cpuSystemPercent(cpuSystem  < 0 ? 0 : cpuSystem)
                .heapUsedMb(heapUsed / 1024 / 1024)
                .heapMaxMb(heapMax   / 1024 / 1024)
                .nonHeapUsedMb(nonHeap / 1024 / 1024)
                .totalPhysicalMemoryMb(OS_BEAN.getTotalMemorySize() / 1024 / 1024)
                .freePhysicalMemoryMb(OS_BEAN.getFreeMemorySize()   / 1024 / 1024)
                .activeSseConnections(sseRegistry.connectedUserIds().size())
                .threadCount(Thread.activeCount())
                .uptimeSeconds(ManagementFactory.getRuntimeMXBean().getUptime() / 1000)
                .build();
    }
}
