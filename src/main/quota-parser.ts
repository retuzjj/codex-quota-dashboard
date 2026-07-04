import type { QuotaSnapshot, QuotaWindow } from "../shared/types";

type UnknownRecord = Record<string, unknown>;

const FIVE_HOURS_MINS = 300;
const WEEK_MINS = 10_080;

export function parseLiveRateLimits(
  result: unknown,
  updatedAt = new Date().toISOString()
): QuotaSnapshot {
  const root = asRecord(result);
  const direct = asOptionalRecord(root.rateLimits);
  const byId = asOptionalRecord(root.rateLimitsByLimitId);
  const rateLimits = direct ?? firstRecordValue(byId);

  if (!rateLimits) {
    throw new Error("Codex did not return rate-limit data.");
  }

  return makeSnapshot(rateLimits, "live", updatedAt, null, "camel");
}

export function parseLogLine(line: string): QuotaSnapshot | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }

  const root = asOptionalRecord(value);
  const payload = root && asOptionalRecord(root.payload);
  const rateLimits = payload && asOptionalRecord(payload.rate_limits);
  if (!root || !rateLimits) {
    return null;
  }

  const timestamp =
    typeof root.timestamp === "string"
      ? root.timestamp
      : new Date().toISOString();

  return makeSnapshot(
    rateLimits,
    "cache",
    timestamp,
    "实时查询失败，当前显示最近一次 Codex 会话中的缓存数据。",
    "snake"
  );
}

function makeSnapshot(
  raw: UnknownRecord,
  source: "live" | "cache",
  updatedAt: string,
  warning: string | null,
  format: "camel" | "snake"
): QuotaSnapshot {
  const primary = parseWindow(
    asOptionalRecord(raw.primary),
    format
  );
  const secondary = parseWindow(
    asOptionalRecord(raw.secondary),
    format
  );
  const windows = [primary, secondary].filter(
    (window): window is QuotaWindow => window !== null
  );

  return {
    fiveHour:
      windows.find(
        (window) => window.windowDurationMins === FIVE_HOURS_MINS
      ) ?? null,
    weekly:
      windows.find((window) => window.windowDurationMins === WEEK_MINS) ??
      null,
    planType: readString(raw, format === "camel" ? "planType" : "plan_type"),
    source,
    updatedAt,
    warning
  };
}

function parseWindow(
  raw: UnknownRecord | null,
  format: "camel" | "snake"
): QuotaWindow | null {
  if (!raw) {
    return null;
  }

  const used = readNumber(
    raw,
    format === "camel" ? "usedPercent" : "used_percent"
  );
  const duration = readNumber(
    raw,
    format === "camel" ? "windowDurationMins" : "window_minutes"
  );
  const resetsAt = readNumber(
    raw,
    format === "camel" ? "resetsAt" : "resets_at"
  );

  if (used === null || duration === null || resetsAt === null) {
    return null;
  }

  const usedPercent = clamp(used, 0, 100);
  return {
    usedPercent,
    remainingPercent: 100 - usedPercent,
    windowDurationMins: duration,
    resetsAt
  };
}

function asRecord(value: unknown): UnknownRecord {
  const record = asOptionalRecord(value);
  if (!record) {
    throw new Error("Expected an object.");
  }
  return record;
}

function asOptionalRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function firstRecordValue(record: UnknownRecord | null): UnknownRecord | null {
  if (!record) {
    return null;
  }
  for (const value of Object.values(record)) {
    const item = asOptionalRecord(value);
    if (item) {
      return item;
    }
  }
  return null;
}

function readNumber(record: UnknownRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
