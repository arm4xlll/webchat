package com.webchat.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BusinessMetricsDto {
    private long   totalUsers;
    private long   dailyActiveUsers;
    private long   messagesLastMinute;
    private double messagesPerSecond;
    private long   messagesToday;
}
