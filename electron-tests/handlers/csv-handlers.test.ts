import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeAll, afterAll, afterEach, assert } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { registerCsvHandlers } from "../../electron/handlers/csv-handlers";
import type { IpcApi } from "../../electron/lib/types/ipc";
import {
  createTestPrismaClient,
  cleanupTestDb,
} from "../helpers/test-helpers";

// ── Fixture setup ─────────────────────────────────────────────────────────────

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

let prisma: PrismaClient;
let dbPath: string;
let handlers: Record<string, Handler>;

const tempFiles: string[] = [];

function tempCsvPath(): string {
  const p = path.join(os.tmpdir(), `csv-handler-test-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`);
  tempFiles.push(p);
  return p;
}

function writeCsv(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf-8");
}

// Mutable dialog shim — tests set these before invoking handlers
let nextOpenDialog: Awaited<ReturnType<Electron.Dialog["showOpenDialog"]>> = {
  filePaths: [],
  canceled: true,
};
let nextSaveDialog: Awaited<ReturnType<Electron.Dialog["showSaveDialog"]>> = {
  filePath: undefined,
  canceled: true,
};

const fakeDialog = {
  showOpenDialog: () => Promise.resolve(nextOpenDialog),
  showSaveDialog: () => Promise.resolve(nextSaveDialog),
} as unknown as Electron.Dialog;

beforeAll(() => {
  ({ prisma, dbPath } = createTestPrismaClient());

  handlers = {};
  const fakeIpcMain = {
    handle(channel: string, handler: Handler) {
      handlers[channel] = handler;
    },
  };
  registerCsvHandlers(fakeIpcMain as never, prisma, fakeDialog);
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb(dbPath);
  for (const f of tempFiles) {
    try { fs.unlinkSync(f); } catch { /* ignore */ }
  }
});

afterEach(async () => {
  await prisma.session.deleteMany();
  await prisma.client.deleteMany();
  await prisma.therapist.deleteMany();
  nextOpenDialog = { filePaths: [], canceled: true };
  nextSaveDialog = { filePath: undefined, canceled: true };
});

async function invoke<C extends keyof IpcApi & string>(
  channel: C,
  ...args: IpcApi[C]["args"] extends void ? [] : [IpcApi[C]["args"]]
): Promise<IpcApi[C]["result"]> {
  const handler = handlers[channel];
  if (!handler) {
    throw new Error(`No handler for ${channel}`);
  }
  return handler({} as never, ...(args as never[])) as Promise<IpcApi[C]["result"]>;
}

// ── therapist:import-csv ─────────────────────────────────────────────────────

describe("therapist:import-csv — canceled", () => {
  it("returns null when the file picker is dismissed", async () => {
    nextOpenDialog = { filePaths: [], canceled: true };
    const result = await invoke("therapist:import-csv");
    assert(result.success);
    expect(result.data).toBeNull();
  });
});

describe("therapist:import-csv — empty file", () => {
  it("returns inserted 0 with no errors for an empty CSV", async () => {
    const filePath = tempCsvPath();
    writeCsv(filePath, "first_name,last_name,start_date,is_admin\n");
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("therapist:import-csv");
    assert(result.success);
    expect(result.data).toEqual({ inserted: 0, errors: [] });
  });
});

describe("therapist:import-csv — missing required header", () => {
  it("returns a row-0 error listing the missing column", async () => {
    const filePath = tempCsvPath();
    writeCsv(filePath, "first_name,last_name\nAlice,Morgan\n");
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("therapist:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.inserted).toBe(0);
    expect(result.data.errors[0]!.row).toBe(0);
    expect(result.data.errors[0]!.message).toContain("start_date");
  });
});

describe("therapist:import-csv — valid import", () => {
  it("inserts therapists and returns the count", async () => {
    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      "first_name,last_name,start_date,is_admin\nAlice,Morgan,2024-01-15,true\nBob,Chen,2024-06-01,false\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("therapist:import-csv");
    assert(result.success);
    expect(result.data).toEqual({ inserted: 2, errors: [] });

    const count = await prisma.therapist.count();
    expect(count).toBe(2);
  });
});

// ── client:import-csv ────────────────────────────────────────────────────────

describe("client:import-csv — canceled", () => {
  it("returns null when the file picker is dismissed", async () => {
    nextOpenDialog = { filePaths: [], canceled: true };
    const result = await invoke("client:import-csv");
    assert(result.success);
    expect(result.data).toBeNull();
  });
});

describe("client:import-csv — missing required header", () => {
  it("returns a row-0 error listing the missing column", async () => {
    const filePath = tempCsvPath();
    writeCsv(filePath, "hospital_number,first_name,last_name\nHN001,Jane,Smith\n");
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("client:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.errors[0]!.row).toBe(0);
    expect(result.data.errors[0]!.message).toMatch(/Missing required columns/i);
  });
});

describe("client:import-csv — unknown therapist", () => {
  it("returns a row-level error when the therapist is not in the database", async () => {
    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      [
        "hospital_number,first_name,last_name,dob,start_date,therapist_first_name,therapist_last_name,phone",
        "HN001,Jane,Smith,2000-01-15,2025-09-01,NoSuch,Person,07700900001",
      ].join("\n") + "\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("client:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.inserted).toBe(0);
    expect(result.data.errors[0]!.row).toBe(2);
    expect(result.data.errors[0]!.message).toContain('therapist "NoSuch Person" not found');
  });
});

describe("client:import-csv — duplicate hospital_number against DB", () => {
  it("returns a row-level error when hospital_number already exists in the database", async () => {
    await prisma.therapist.create({
      data: { first_name: "Alice", last_name: "Morgan", is_admin: false, start_date: new Date("2024-01-01") },
    });
    await prisma.client.create({
      data: {
        hospital_number: "HN001",
        first_name: "Existing",
        last_name: "Client",
        dob: new Date("1990-01-01"),
        start_date: new Date("2020-01-01"),
        therapist: { connect: { id: (await prisma.therapist.findFirst())!.id } },
      },
    });

    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      [
        "hospital_number,first_name,last_name,dob,start_date,therapist_first_name,therapist_last_name,phone",
        "HN001,Jane,Smith,2000-01-15,2025-09-01,Alice,Morgan,07700900001",
      ].join("\n") + "\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("client:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.inserted).toBe(0);
    expect(result.data.errors[0]!.row).toBe(2);
    expect(result.data.errors[0]!.message).toContain('"HN001" already exists');
  });
});

describe("client:import-csv — duplicate hospital_number within file", () => {
  it("flags both rows when the same hospital_number appears twice in the CSV", async () => {
    await prisma.therapist.create({
      data: { first_name: "Alice", last_name: "Morgan", is_admin: false, start_date: new Date("2024-01-01") },
    });

    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      [
        "hospital_number,first_name,last_name,dob,start_date,therapist_first_name,therapist_last_name,phone",
        "HN001,Jane,Smith,2000-01-15,2025-09-01,Alice,Morgan,07700900001",
        "HN001,John,Doe,2001-03-20,2025-10-01,Alice,Morgan,07700900002",
      ].join("\n") + "\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("client:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.inserted).toBe(0);
    expect(result.data.errors).toHaveLength(2);
    expect(result.data.errors[0]!.row).toBe(2);
    expect(result.data.errors[1]!.row).toBe(3);
    expect(result.data.errors[0]!.message).toContain("duplicated in this file");
  });
});

describe("client:import-csv — valid import", () => {
  it("inserts clients and returns the count", async () => {
    await prisma.therapist.create({
      data: { first_name: "Alice", last_name: "Morgan", is_admin: false, start_date: new Date("2024-01-01") },
    });

    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      [
        "hospital_number,first_name,last_name,dob,start_date,therapist_first_name,therapist_last_name,phone",
        "HN001,Jane,Smith,2000-01-15,2025-09-01,Alice,Morgan,07700900001",
        "HN002,John,Doe,2001-03-20,2025-10-01,Alice,Morgan,07700900002",
      ].join("\n") + "\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("client:import-csv");
    assert(result.success);
    expect(result.data).toEqual({ inserted: 2, errors: [] });

    const count = await prisma.client.count();
    expect(count).toBe(2);
  });
});

// ── session:import-csv ───────────────────────────────────────────────────────

describe("session:import-csv — canceled", () => {
  it("returns null when the file picker is dismissed", async () => {
    nextOpenDialog = { filePaths: [], canceled: true };
    const result = await invoke("session:import-csv");
    assert(result.success);
    expect(result.data).toBeNull();
  });
});

describe("session:import-csv — missing required header", () => {
  it("returns a row-0 error listing the missing column", async () => {
    const filePath = tempCsvPath();
    writeCsv(filePath, "client_first_name,client_last_name\nJane,Smith\n");
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("session:import-csv");
    assert(result.success);
    assert(result.data !== null);
    expect(result.data.errors[0]!.row).toBe(0);
    expect(result.data.errors[0]!.message).toMatch(/Missing required columns/i);
  });
});

describe("session:import-csv — valid import", () => {
  it("inserts sessions and returns the count", async () => {
    const therapist = await prisma.therapist.create({
      data: { first_name: "Alice", last_name: "Morgan", is_admin: false, start_date: new Date("2024-01-01") },
    });
    await prisma.client.create({
      data: {
        hospital_number: "HN001",
        first_name: "Jane",
        last_name: "Smith",
        dob: new Date("2000-01-15"),
        start_date: new Date("2025-09-01"),
        therapist_id: therapist.id,
        phone: "07700900001",
      },
    });

    const filePath = tempCsvPath();
    writeCsv(
      filePath,
      [
        "client_first_name,client_last_name,therapist_first_name,therapist_last_name,scheduled_date,scheduled_time,duration,session_type,delivery_method",
        "Jane,Smith,Alice,Morgan,2026-03-01,10:00,60,Child,FaceToFace",
      ].join("\n") + "\n",
    );
    nextOpenDialog = { filePaths: [filePath], canceled: false };

    const result = await invoke("session:import-csv");
    assert(result.success);
    expect(result.data).toEqual({ inserted: 1, errors: [] });

    const count = await prisma.session.count();
    expect(count).toBe(1);
  });
});

// ── therapist:save-template ───────────────────────────────────────────────────

describe("therapist:save-template — canceled", () => {
  it("returns null when the save dialog is dismissed", async () => {
    nextSaveDialog = { filePath: undefined, canceled: true };
    const result = await invoke("therapist:save-template");
    assert(result.success);
    expect(result.data).toBeNull();
  });
});

describe("therapist:save-template — saved", () => {
  it("writes CSV headers to the file and returns the path", async () => {
    const filePath = tempCsvPath();
    nextSaveDialog = { filePath, canceled: false };

    const result = await invoke("therapist:save-template");
    assert(result.success);
    expect(result.data).toEqual({ path: filePath });

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("first_name");
    expect(content).toContain("last_name");
    expect(content).toContain("start_date");
  });
});
