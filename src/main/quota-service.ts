import { CodexClientError, fetchLiveQuota } from "./codex-client";
import { readLatestCachedQuota } from "./log-fallback";
import type { DashboardError, QuotaResult } from "../shared/types";

let activeRequest: Promise<QuotaResult> | null = null;

export function getQuota(): Promise<QuotaResult> {
  if (!activeRequest) {
    activeRequest = performQuotaRequest().finally(() => {
      activeRequest = null;
    });
  }
  return activeRequest;
}

async function performQuotaRequest(): Promise<QuotaResult> {
  let liveError: unknown;
  try {
    return { ok: true, data: await fetchLiveQuota() };
  } catch (error) {
    liveError = error;
  }

  try {
    const cached = await readLatestCachedQuota();
    if (cached) {
      return { ok: true, data: cached };
    }
  } catch {
    // The live error is more useful than a cache-scanning failure.
  }

  return { ok: false, error: toDashboardError(liveError) };
}

function toDashboardError(error: unknown): DashboardError {
  if (error instanceof CodexClientError) {
    if (error.kind === "not-found") {
      return {
        code: "CODEX_NOT_FOUND",
        message: "未找到 Codex CLI。请先安装 Codex，并确保 codex 命令位于 PATH。"
      };
    }
    if (error.kind === "auth") {
      return {
        code: "NOT_LOGGED_IN",
        message: "Codex 尚未登录或登录已失效，请先运行 codex login。"
      };
    }
    if (error.kind === "protocol") {
      return {
        code: "PROTOCOL_ERROR",
        message: "当前 Codex 版本不支持额度查询协议，请升级 Codex CLI。"
      };
    }
  }

  return {
    code: "NO_DATA",
    message:
      "暂时无法获取额度，也没有可用的本地缓存。请检查 Codex 登录状态和网络连接。"
  };
}
