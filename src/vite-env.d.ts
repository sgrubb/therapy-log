/// <reference types="vite/client" />

import type { ElectronAPI } from "@/lib/types/ipc";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
