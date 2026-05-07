import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export interface AppConfig {
  databasePath: string;
  createdByApp: boolean;
  initialSelectedTherapistId?: number;
}

const CONFIG_FILE = "config.json";

function getConfigPath(): string {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function readConfig(): AppConfig | null {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: AppConfig): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2));
}

export function getConfiguredDbPath(): string | null {
  if (!app.isPackaged) {
    const envUrl = process.env["DATABASE_URL"];
    if (!envUrl) {
      return null;
    }
    return envUrl.replace(/^file:/, "");
  }
  return readConfig()?.databasePath ?? null;
}

export function getInitialSelectedTherapistId(): number | null {
  return readConfig()?.initialSelectedTherapistId ?? null;
}

export function resolveDatabaseUrl(): { url: string | null; createdByApp: boolean } {
  if (!app.isPackaged) {
    const envUrl = process.env["DATABASE_URL"];
    if (!envUrl) {
      throw new Error("DATABASE_URL is not set. Add it to the .env file in the project root.");
    }
    return { url: envUrl, createdByApp: true };
  }

  const config = readConfig();
  if (!config) {
    return { url: null, createdByApp: false };
  }

  return { url: `file:${config.databasePath}`, createdByApp: config.createdByApp };
}
