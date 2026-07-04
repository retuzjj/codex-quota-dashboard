import { contextBridge, ipcRenderer } from "electron";
import type { DashboardApi } from "../shared/types";

const api: DashboardApi = {
  getQuota: () => ipcRenderer.invoke("quota:get"),
  getAutoStart: () => ipcRenderer.invoke("settings:get-auto-start"),
  setAutoStart: (enabled) =>
    ipcRenderer.invoke("settings:set-auto-start", enabled),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  closeWindow: () => ipcRenderer.invoke("window:close")
};

contextBridge.exposeInMainWorld("quotaDashboard", api);
