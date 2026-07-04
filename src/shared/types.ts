export type QuotaSource = "live" | "cache";

export interface QuotaWindow {
  usedPercent: number;
  remainingPercent: number;
  windowDurationMins: number;
  resetsAt: number;
}

export interface QuotaSnapshot {
  fiveHour: QuotaWindow | null;
  weekly: QuotaWindow | null;
  planType: string | null;
  source: QuotaSource;
  updatedAt: string;
  warning: string | null;
}

export interface DashboardError {
  code:
    | "CODEX_NOT_FOUND"
    | "NOT_LOGGED_IN"
    | "PROTOCOL_ERROR"
    | "NO_DATA"
    | "UNKNOWN";
  message: string;
}

export type QuotaResult =
  | { ok: true; data: QuotaSnapshot }
  | { ok: false; error: DashboardError };

export interface DashboardApi {
  getQuota(): Promise<QuotaResult>;
  getAutoStart(): Promise<boolean>;
  setAutoStart(enabled: boolean): Promise<boolean>;
  minimizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
}
