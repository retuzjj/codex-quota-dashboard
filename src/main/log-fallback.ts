import { open, readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseLogLine } from "./quota-parser";
import type { QuotaSnapshot } from "../shared/types";

const MAX_TAIL_BYTES = 1_048_576;

export async function readLatestCachedQuota(
  codexHome = process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex")
): Promise<QuotaSnapshot | null> {
  const sessionsDir = path.join(codexHome, "sessions");
  const files = await findJsonlFiles(sessionsDir);

  const dated = await Promise.all(
    files.map(async (file) => ({
      file,
      mtimeMs: (await stat(file)).mtimeMs
    }))
  );
  dated.sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const { file } of dated.slice(0, 20)) {
    const snapshot = await parseTail(file);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
}

async function findJsonlFiles(directory: string): Promise<string[]> {
  const output: string[] = [];
  const pending = [directory];

  while (pending.length > 0) {
    const current = pending.pop() as string;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        output.push(fullPath);
      }
    }
  }

  return output;
}

async function parseTail(file: string): Promise<QuotaSnapshot | null> {
  const handle = await open(file, "r");
  try {
    const info = await handle.stat();
    const length = Math.min(info.size, MAX_TAIL_BYTES);
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, info.size - length);
    const lines = buffer.toString("utf8").split(/\r?\n/);

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const snapshot = parseLogLine(lines[index]);
      if (snapshot) {
        return snapshot;
      }
    }
    return null;
  } finally {
    await handle.close();
  }
}
