import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import readline from "node:readline";
import { parseLiveRateLimits } from "./quota-parser";
import type { QuotaSnapshot } from "../shared/types";

interface RpcResponse {
  id?: number;
  result?: unknown;
  error?: { message?: string };
}

export class CodexClientError extends Error {
  constructor(
    message: string,
    readonly kind: "not-found" | "auth" | "protocol" | "unknown"
  ) {
    super(message);
  }
}

export async function fetchLiveQuota(
  timeoutMs = 15_000
): Promise<QuotaSnapshot> {
  const child = spawnCodex();

  return new Promise<QuotaSnapshot>((resolve, reject) => {
    let settled = false;
    let stderr = "";
    const lines = readline.createInterface({ input: child.stdout });
    const timer = setTimeout(() => {
      finish(
        new CodexClientError(
          "Codex 额度查询超时，请检查登录状态和网络连接。",
          "unknown"
        )
      );
    }, timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.once("error", (error: NodeJS.ErrnoException) => {
      const kind = error.code === "ENOENT" ? "not-found" : "unknown";
      finish(new CodexClientError(error.message, kind));
    });

    child.once("exit", (code) => {
      if (!settled) {
        finish(classifyFailure(stderr || `Codex exited with code ${code}.`));
      }
    });

    lines.on("line", (line) => {
      let message: RpcResponse;
      try {
        message = JSON.parse(line) as RpcResponse;
      } catch {
        return;
      }

      if (message.id === 1) {
        if (message.error) {
          finish(classifyFailure(message.error.message ?? "初始化失败。"));
          return;
        }
        send(child, { method: "initialized" });
        send(child, { id: 2, method: "account/rateLimits/read" });
        return;
      }

      if (message.id === 2) {
        if (message.error) {
          finish(classifyFailure(message.error.message ?? "额度查询失败。"));
          return;
        }
        try {
          finish(null, parseLiveRateLimits(message.result));
        } catch (error) {
          finish(
            new CodexClientError(
              error instanceof Error ? error.message : String(error),
              "protocol"
            )
          );
        }
      }
    });

    send(child, {
      id: 1,
      method: "initialize",
      params: {
        clientInfo: {
          name: "codex-quota-dashboard",
          title: "Codex Quota Dashboard",
          version: "0.1.0"
        },
        capabilities: {
          experimentalApi: true
        }
      }
    });

    function finish(error: Error | null, value?: QuotaSnapshot): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      lines.close();
      child.kill();
      if (error) {
        reject(error);
      } else {
        resolve(value as QuotaSnapshot);
      }
    }
  });
}

function spawnCodex(): ChildProcessWithoutNullStreams {
  if (process.platform === "win32") {
    return spawn(
      process.env.ComSpec ?? "cmd.exe",
      ["/d", "/s", "/c", "codex app-server --stdio"],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] }
    );
  }

  return spawn("codex", ["app-server", "--stdio"], {
    stdio: ["pipe", "pipe", "pipe"]
  });
}

function send(
  child: ChildProcessWithoutNullStreams,
  message: Record<string, unknown>
): void {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

function classifyFailure(message: string): CodexClientError {
  const lower = message.toLowerCase();
  if (
    lower.includes("codex: command not found") ||
    lower.includes("'codex' is not recognized") ||
    lower.includes("codex is not recognized") ||
    lower.includes("cannot find the file specified")
  ) {
    return new CodexClientError(message, "not-found");
  }
  if (
    lower.includes("login") ||
    lower.includes("unauthorized") ||
    lower.includes("authentication")
  ) {
    return new CodexClientError(message, "auth");
  }
  if (
    lower.includes("method not found") ||
    lower.includes("unknown method") ||
    lower.includes("invalid request")
  ) {
    return new CodexClientError(message, "protocol");
  }
  return new CodexClientError(message, "unknown");
}
