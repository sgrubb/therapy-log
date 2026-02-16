import { contextBridge, ipcRenderer } from "electron";
import type { IpcApi, IpcChannel } from "./ipc-api";

const api = {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: IpcApi[C]["args"] extends void ? [] : [IpcApi[C]["args"]]
  ): Promise<IpcApi[C]["result"]> {
    return ipcRenderer.invoke(channel, ...args);
  },
};

export type ElectronApi = typeof api;

contextBridge.exposeInMainWorld("electronAPI", api);
