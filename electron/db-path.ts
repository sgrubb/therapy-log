import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

interface AppConfig {
  databasePath: string;
}

const CONFIG_FILE = "config.json";

function getConfigPath(): string {
  return path.join(app.getPath("userData"), CONFIG_FILE);
}

function readConfig(): AppConfig | null {
  const configPath = getConfigPath();
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: AppConfig): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Resolve the database URL for the Prisma adapter.
 *
 * - Development: reads DATABASE_URL from the .env file (loaded by dotenv
 *   before this function is called).
 * - Production:  reads the path from userData/config.json. Returns null if
 *   no config exists yet (first-run setup needed).
 */
export function resolveDatabaseUrl(): string | null {
  if (!app.isPackaged) {
    const envUrl = process.env["DATABASE_URL"];
    if (!envUrl) {
      throw new Error(
        "DATABASE_URL is not set. Add it to the .env file in the project root.",
      );
    }
    return envUrl;
  }

  const config = readConfig();
  if (!config) {
    // TODO (Phase 6): Show first-run setup screen prompting the user to
    // select or create a database file. Store the chosen path in config.json
    // for subsequent launches.
    return null;
  }

  return `file:${config.databasePath}`;
}
