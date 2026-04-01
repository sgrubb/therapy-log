import Database from "better-sqlite3";
import log from "./logger";
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../generated/migrations.generated";

export { CURRENT_SCHEMA_VERSION };

const LAST_PRE_METADATA_VERSION = 3;

function hasKnownAppTables(db: Database.Database): boolean {
  const tables = ["Therapist", "Client", "Session"];
  return tables.every(
    (name) =>
      db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`)
        .get() !== undefined,
  );
}

export function checkSchemaVersion(dbPath: string): number | null {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true });

    const metadataExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Metadata'`)
      .get();

    if (!metadataExists) {
      return hasKnownAppTables(db) ? LAST_PRE_METADATA_VERSION : null;
    }

    const row = db
      .prepare(`SELECT value FROM Metadata WHERE key = 'schema_version'`)
      .get() as { value: string } | undefined;

    if (!row) {
      return hasKnownAppTables(db) ? LAST_PRE_METADATA_VERSION : null;
    }

    return parseInt(row.value, 10);
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export function applyMigrations(dbPath: string, fromVersion: number, toVersion: number): void {
  const db = new Database(dbPath);
  try {
    for (let v = fromVersion + 1; v <= toVersion; v++) {
      const sql = MIGRATIONS[v];
      if (!sql) {
        throw new Error(`No migration SQL found for version ${v}`);
      }
      db.exec(sql);
      log.info(`Applied migration to version ${v}`);
    }
    db.prepare(`INSERT OR REPLACE INTO Metadata (key, value) VALUES ('schema_version', ?)`).run(
      String(toVersion),
    );
    log.info(`Database at ${dbPath} migrated from version ${fromVersion} to ${toVersion}`);
  } finally {
    db.close();
  }
}

export function initializeDatabase(dbPath: string): void {
  applyMigrations(dbPath, 0, CURRENT_SCHEMA_VERSION);
  log.info(`Database initialized at ${dbPath}`);
}

export function validateDatabase(dbPath: string): {
  valid: boolean;
  version?: number;
  error?: string;
} {
  let db: Database.Database | null = null;
  try {
    db = new Database(dbPath, { readonly: true });

    const tableExists = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Metadata'`)
      .get();
    if (!tableExists) {
      return { valid: false, error: "No schema version found. This database may be incompatible." };
    }

    const row = db
      .prepare(`SELECT value FROM Metadata WHERE key = 'schema_version'`)
      .get() as { value: string } | undefined;
    if (!row) {
      return { valid: false, error: "No schema version found. This database may be incompatible." };
    }

    const version = parseInt(row.value, 10);
    return { valid: true, version };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Failed to open database.",
    };
  } finally {
    db?.close();
  }
}
