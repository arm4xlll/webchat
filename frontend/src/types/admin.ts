export interface SystemHealthDto {
  cpuProcessPercent: number;
  cpuSystemPercent: number;
  heapUsedMb: number;
  heapMaxMb: number;
  nonHeapUsedMb: number;
  totalPhysicalMemoryMb: number;
  freePhysicalMemoryMb: number;
  activeSseConnections: number;
  threadCount: number;
  uptimeSeconds: number;
}

export interface HttpStatsDto {
  rps: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  count2xx: number;
  count4xx: number;
  count5xx: number;
  totalRequests: number;
}

export interface BusinessMetricsDto {
  totalUsers: number;
  dailyActiveUsers: number;
  messagesLastMinute: number;
  messagesPerSecond: number;
  messagesToday: number;
}

export interface AdminMetricsSnapshot {
  timestamp: number;
  system: SystemHealthDto;
  http: HttpStatsDto;
  business: BusinessMetricsDto;
}

export interface ErrorEntry {
  timestamp: string;
  type: string;
  message: string;
  stackTrace: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  avatarUrl?: string;
  isAdmin: boolean;
  isRoot: boolean;
}
