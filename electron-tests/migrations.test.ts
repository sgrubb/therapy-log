import { describe, it, expect, afterAll } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MIGRATIONS, CURRENT_SCHEMA_VERSION } from "../electron/generated/migrations.generated";
import { applyMigrations, initializeDatabase } from "../electron/lib/migrations";

const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");

const filesToCleanup: string[] = [];

function tempDbPath(): string {
  const p = path.join(
    os.tmpdir(),
    `migrations-test-${Date.now()}-${Math.random().toString(36).slice(2)}.db`,
  );
  filesToCleanup.push(p);
  return p;
}

function applyAllMigrationFiles(db: Database.Database): void {
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory())
    .sort()
    .map((dir) => path.join(MIGRATIONS_DIR, dir, "migration.sql"));

  for (const file of migrationFiles) {
    db.exec(fs.readFileSync(file, "utf-8"));
  }
}

function getAppTableInfo(db: Database.Database): Record<string, unknown[]> {
  const excluded = new Set(["_prisma_migrations", "Metadata"]);
  const tables = (
    db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all() as Array<{ name: string }>
  )
    .map((r) => r.name)
    .filter((n) => !excluded.has(n));

  return Object.fromEntries(
    tables.map((table) => [table, db.prepare(`PRAGMA table_info("${table}")`).all()]),
  );
}

afterAll(() => {
  for (const p of filesToCleanup) {
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }
});

describe("migrations", () => {
  it("CURRENT_SCHEMA_VERSION matches number of migration directories", () => {
    const count = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => fs.statSync(path.join(MIGRATIONS_DIR, f)).isDirectory()).length;
    expect(CURRENT_SCHEMA_VERSION).toBe(count);
  });

  it("MIGRATIONS keys cover 1..CURRENT_SCHEMA_VERSION", () => {
    for (let v = 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      expect(MIGRATIONS[v]).toBeTruthy();
    }
  });

  it("applyMigrations(0, CURRENT) produces same schema as migration files", () => {
    const initPath = tempDbPath();
    initializeDatabase(initPath);
    const initDb = new Database(initPath);
    const initSchema = getAppTableInfo(initDb);
    initDb.close();

    const migrationPath = tempDbPath();
    const migrationDb = new Database(migrationPath);
    applyAllMigrationFiles(migrationDb);
    const migrationSchema = getAppTableInfo(migrationDb);
    migrationDb.close();

    expect(initSchema).toEqual(migrationSchema);
  });

  it("applyMigrations creates Metadata table", () => {
    const dbPath = tempDbPath();
    initializeDatabase(dbPath);
    const db = new Database(dbPath);
    const metadata = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='Metadata'`)
      .get();
    db.close();
    expect(metadata).toBeDefined();
  });

  it("applyMigrations sets schema_version in Metadata", () => {
    const dbPath = tempDbPath();
    initializeDatabase(dbPath);
    const db = new Database(dbPath);
    const row = db
      .prepare(`SELECT value FROM Metadata WHERE key = 'schema_version'`)
      .get() as { value: string };
    db.close();
    expect(Number(row.value)).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("applyMigrations can upgrade incrementally", () => {
    // Start at version 3 (first 3 migrations applied manually)
    const dbPath = tempDbPath();
    const db = new Database(dbPath);
    for (let v = 1; v <= 3; v++) {
      db.exec(MIGRATIONS[v]!);
    }
    db.close();

    // Now upgrade from 3 to CURRENT
    applyMigrations(dbPath, 3, CURRENT_SCHEMA_VERSION);

    const upgraded = new Database(dbPath);
    const row = upgraded
      .prepare(`SELECT value FROM Metadata WHERE key = 'schema_version'`)
      .get() as { value: string };
    upgraded.close();
    expect(Number(row.value)).toBe(CURRENT_SCHEMA_VERSION);
  });
});
