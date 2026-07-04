import { app } from "electron";
import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function getAutoStart(): Promise<boolean> {
  if (process.platform !== "linux") {
    return app.getLoginItemSettings({
      path: process.execPath,
      args: loginArgs()
    }).openAtLogin;
  }

  try {
    await access(linuxDesktopFile());
    return true;
  } catch {
    return false;
  }
}

export async function setAutoStart(enabled: boolean): Promise<boolean> {
  if (process.platform !== "linux") {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false,
      path: process.execPath,
      args: loginArgs()
    });
    return app.getLoginItemSettings({
      path: process.execPath,
      args: loginArgs()
    }).openAtLogin;
  }

  const desktopFile = linuxDesktopFile();
  if (!enabled) {
    await unlink(desktopFile).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
    return false;
  }

  await mkdir(path.dirname(desktopFile), { recursive: true });
  const command = [process.execPath, ...loginArgs()]
    .map((item) => `"${escapeDesktopExec(item)}"`)
    .join(" ");
  const contents = [
    "[Desktop Entry]",
    "Type=Application",
    "Version=1.0",
    "Name=Codex Quota Dashboard",
    `Exec=${command}`,
    "Terminal=false",
    "X-GNOME-Autostart-enabled=true",
    "Comment=Show current Codex usage limits",
    ""
  ].join("\n");
  await writeFile(desktopFile, contents, "utf8");
  return true;
}

function linuxDesktopFile(): string {
  const configHome =
    process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config");
  return path.join(configHome, "autostart", "codex-quota-dashboard.desktop");
}

function escapeDesktopExec(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function loginArgs(): string[] {
  return app.isPackaged ? [] : [app.getAppPath()];
}
