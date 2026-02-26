export type DamageStatus = 'OPEN' | 'CUSTOMER_NOTIFIED' | 'DESTROY_STOCK' | 'REP_COLLECT' | 'CLOSED';

export type DamageCause =
  | 'FORKLIFT_IMPACT' | 'DROPPED_DURING_HANDLING' | 'WATER_DAMAGE' | 'CRUSH_DAMAGE'
  | 'PALLET_FAILURE' | 'TEMPERATURE_EXPOSURE' | 'INCORRECT_STACKING'
  | 'TRANSIT_DAMAGE_INBOUND' | 'TRANSIT_DAMAGE_OUTBOUND' | 'PEST_DAMAGE'
  | 'EXPIRED_PRODUCT' | 'PACKAGING_FAILURE' | 'UNKNOWN' | 'OTHER';

export interface ActionMetric {
  agent: string;
  action: string;
  timestamp: number;
  durationMs: number;
  httpStatus: number;
  success: boolean;
  errorMessage?: string;
  requestSizeBytes?: number;
  responseSizeBytes?: number;
}

export interface TestReport {
  testStartTime: string;
  testEndTime: string;
  totalDurationMinutes: number;
  agentCount: number;

  summary: {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    errorRate: number;
    actionsPerMinute: number;
  };

  responseTimesMs: {
    min: number;
    max: number;
    mean: number;
    median: number;
    p95: number;
    p99: number;
  };

  byAction: Record<string, {
    count: number;
    successCount: number;
    failCount: number;
    avgDurationMs: number;
    p95DurationMs: number;
    errorRate: number;
  }>;

  byAgent: Record<string, {
    totalActions: number;
    successRate: number;
    avgDurationMs: number;
    damageReportsCreated: number;
    photosUploaded: number;
    statusTransitions: number;
    commentsAdded: number;
  }>;

  errors: Array<{
    timestamp: string;
    agent: string;
    action: string;
    httpStatus: number;
    message: string;
  }>;

  timeline: Array<{
    minuteMark: number;
    activeAgents: number;
    actionsThisMinute: number;
    errorsThisMinute: number;
    avgResponseMs: number;
  }>;

  passFailResult: 'PASS' | 'FAIL';
  failReasons: string[];
}

export interface CachedEntity {
  id: string;
  name?: string;
  code?: string;
  sku?: string;
}
