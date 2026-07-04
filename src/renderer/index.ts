import type {
  DashboardApi,
  QuotaResult,
  QuotaSnapshot,
  QuotaWindow
} from "../shared/types";

declare global {
  interface Window {
    quotaDashboard: DashboardApi;
  }
}

const elements = {
  refresh: byId<HTMLButtonElement>("refresh"),
  minimize: byId<HTMLButtonElement>("minimize"),
  close: byId<HTMLButtonElement>("close"),
  notice: byId<HTMLElement>("notice"),
  autoStart: byId<HTMLInputElement>("auto-start"),
  status: byId<HTMLElement>("status"),
  statusDot: byId<HTMLElement>("status-dot"),
  plan: byId<HTMLElement>("plan"),
  fiveHour: quotaElements("five-hour"),
  weekly: quotaElements("weekly")
};

let snapshot: QuotaSnapshot | null = null;
let loading = false;

void initialize();

async function initialize(): Promise<void> {
  elements.refresh.addEventListener("click", () => void refresh());
  elements.minimize.addEventListener("click", () => {
    void window.quotaDashboard.minimizeWindow();
  });
  elements.close.addEventListener("click", () => {
    void window.quotaDashboard.closeWindow();
  });
  elements.autoStart.addEventListener("change", () => void updateAutoStart());

  try {
    elements.autoStart.checked = await window.quotaDashboard.getAutoStart();
  } catch {
    elements.autoStart.disabled = true;
  }

  await refresh();
  window.setInterval(() => void refresh(), 60_000);
  window.setInterval(updateCountdowns, 1_000);
}

async function refresh(): Promise<void> {
  if (loading) {
    return;
  }

  loading = true;
  elements.refresh.classList.add("loading");
  elements.refresh.disabled = true;

  try {
    renderResult(await window.quotaDashboard.getQuota());
  } catch {
    renderResult({
      ok: false,
      error: {
        code: "UNKNOWN",
        message: "应用内部通信失败，请重新启动仪表盘。"
      }
    });
  } finally {
    loading = false;
    elements.refresh.classList.remove("loading");
    elements.refresh.disabled = false;
  }
}

function renderResult(result: QuotaResult): void {
  if (!result.ok) {
    snapshot = null;
    showNotice(result.error.message, true);
    elements.status.textContent = "获取失败";
    elements.statusDot.className = "status-dot error";
    elements.plan.textContent = "";
    renderWindow(elements.fiveHour, null);
    renderWindow(elements.weekly, null);
    return;
  }

  snapshot = result.data;
  renderWindow(elements.fiveHour, snapshot.fiveHour);
  renderWindow(elements.weekly, snapshot.weekly);
  elements.status.textContent =
    snapshot.source === "live"
      ? `实时数据 · ${formatClock(snapshot.updatedAt)}`
      : `缓存数据 · ${formatClock(snapshot.updatedAt)}`;
  elements.statusDot.className = `status-dot ${snapshot.source}`;
  elements.plan.textContent = snapshot.planType ?? "";

  if (snapshot.warning) {
    showNotice(snapshot.warning, false);
  } else {
    elements.notice.hidden = true;
  }
}

function renderWindow(
  target: ReturnType<typeof quotaElements>,
  quota: QuotaWindow | null
): void {
  if (!quota) {
    target.remaining.textContent = "--";
    target.used.textContent = "暂无数据";
    target.reset.textContent = "未返回该额度窗口";
    target.gauge.style.setProperty("--progress", "0deg");
    return;
  }

  target.remaining.textContent = `${formatPercent(quota.remainingPercent)}%`;
  target.used.textContent = `已使用 ${formatPercent(quota.usedPercent)}%`;
  target.gauge.style.setProperty(
    "--progress",
    `${quota.remainingPercent * 3.6}deg`
  );
  target.reset.textContent = formatReset(quota.resetsAt);
}

function updateCountdowns(): void {
  if (!snapshot) {
    return;
  }
  if (snapshot.fiveHour) {
    elements.fiveHour.reset.textContent = formatReset(
      snapshot.fiveHour.resetsAt
    );
  }
  if (snapshot.weekly) {
    elements.weekly.reset.textContent = formatReset(snapshot.weekly.resetsAt);
  }
}

async function updateAutoStart(): Promise<void> {
  const requested = elements.autoStart.checked;
  elements.autoStart.disabled = true;
  try {
    elements.autoStart.checked =
      await window.quotaDashboard.setAutoStart(requested);
  } catch {
    elements.autoStart.checked = !requested;
    showNotice("无法更新自动启动设置，请检查系统权限。", true);
  } finally {
    elements.autoStart.disabled = false;
  }
}

function formatReset(epochSeconds: number): string {
  const remainingSeconds = Math.max(
    0,
    Math.floor(epochSeconds - Date.now() / 1000)
  );
  if (remainingSeconds === 0) {
    return "即将重置";
  }

  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  parts.push(`${minutes}分钟`);
  return `${parts.join(" ")}后重置`;
}

function formatClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function showNotice(message: string, error: boolean): void {
  elements.notice.textContent = message;
  elements.notice.className = error ? "notice error" : "notice";
  elements.notice.hidden = false;
}

function quotaElements(prefix: string) {
  return {
    gauge: byId<HTMLElement>(`${prefix}-gauge`),
    remaining: byId<HTMLElement>(`${prefix}-remaining`),
    used: byId<HTMLElement>(`${prefix}-used`),
    reset: byId<HTMLElement>(`${prefix}-reset`)
  };
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}
