import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "node:path";
import { getAutoStart, setAutoStart } from "./auto-start";
import { getQuota } from "./quota-service";

if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform-hint", "auto");
}

const gotLock = app.requestSingleInstanceLock();
let mainWindow: BrowserWindow | null = null;

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    registerIpc();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

app.on("window-all-closed", () => {
  app.quit();
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 230,
    minWidth: 900,
    minHeight: 230,
    maxWidth: 900,
    maxHeight: 230,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    autoHideMenuBar: true,
    show: false,
    title: "Codex Quota Dashboard",
    backgroundColor: "#0b0d12",
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  void mainWindow.loadFile(
    path.join(__dirname, "../../renderer/index.html")
  );
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpc(): void {
  ipcMain.handle("quota:get", () => getQuota());
  ipcMain.handle("settings:get-auto-start", () => getAutoStart());
  ipcMain.handle(
    "settings:set-auto-start",
    (_event, enabled: unknown) => {
      if (typeof enabled !== "boolean") {
        throw new TypeError("enabled must be a boolean");
      }
      return setAutoStart(enabled);
    }
  );
  ipcMain.handle("window:minimize", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });
  ipcMain.handle("window:close", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close();
  });
}
