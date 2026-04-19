import { describe, it, expect, beforeAll, afterAll, assert } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client";
import { registerDatabaseHandlers } from "../../electron/handlers/database-handlers";
import type { IpcApi } from "../../electron/types/ipc";
import { SortDir } from "@shared/types/enums";
import { IpcErrorCode } from "@shared/types/ipc";
import {
  createTestPrismaClient,
  cleanupTestDb,
  seedTestData,
} from "../helpers/test-helpers";

type Handler = (event: unknown, ...args: unknown[]) => Promise<unknown>;

let prisma: PrismaClient;
let dbPath: string;
let handlers: Record<string, Handler>;
let ids: Awaited<ReturnType<typeof seedTestData>>;

beforeAll(async () => {
  ({ prisma, dbPath } = createTestPrismaClient());
  ids = await seedTestData(prisma);

  handlers = {};
  const fakeIpcMain = {
    handle(channel: string, handler: Handler) {
      handlers[channel] = handler;
    },
  };
  registerDatabaseHandlers(fakeIpcMain as never, prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
  cleanupTestDb(dbPath);
});

async function invoke<C extends keyof IpcApi>(
  channel: C,
  ...args: IpcApi[C]["args"] extends void ? [] : [IpcApi[C]["args"]]
): Promise<IpcApi[C]["result"]> {
  const handler = handlers[channel];
  if (!handler) {
    throw new Error(`No handler for ${String(channel)}`);
  }
  const result = await handler({} as never, ...(args as never[]));
  return result as IpcApi[C]["result"];
}

// ── Therapists ────────────────────────────────────────────────────────

describe("therapist:list", () => {
  it("returns paginated therapists", async () => {
    const result = await invoke("therapist:list", { page: 1, pageSize: 25, sortKey: "last_name", sortDir: "asc" });
    assert(result.success);
    expect(result.data.data).toHaveLength(2);
    expect(result.data.page).toBe(1);
    expect(result.data.total).toBe(2);
  });
});

describe("therapist:get", () => {
  it("returns a therapist by id", async () => {
    const result = await invoke("therapist:get", ids.therapistAlice);
    assert(result.success);
    expect(result.data).toMatchObject({
      id: ids.therapistAlice,
      first_name: "Alice",
      last_name: "Morgan",
      is_admin: true,
    });
  });

  it("returns NOT_FOUND error for nonexistent id", async () => {
    const result = await invoke("therapist:get", 9999);
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.NotFound);
  });
});

describe("therapist:create", () => {
  it("creates a new therapist", async () => {
    const result = await invoke("therapist:create", {
      first_name: "Carol",
      last_name: "Smith",
    });
    assert(result.success);
    expect(result.data).toMatchObject({
      first_name: "Carol",
      last_name: "Smith",
      is_admin: false,
    });
    expect(result.data.id).toBeGreaterThan(0);
  });
});

describe("therapist:update", () => {
  it("updates an existing therapist", async () => {
    const current = await invoke("therapist:get", ids.therapistBob);
    assert(current.success);
    const result = await invoke("therapist:update", {
      id: ids.therapistBob,
      data: { last_name: "Chang", updated_at: current.data.updated_at },
    });
    assert(result.success);
    expect(result.data.last_name).toBe("Chang");
  });

  it("returns CONFLICT for stale updated_at", async () => {
    const result = await invoke("therapist:update", {
      id: ids.therapistBob,
      data: { last_name: "Stale", updated_at: new Date("2020-01-01T00:00:00.000Z") },
    });
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.Conflict);
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("therapist:update", {
      id: 9999,
      data: { last_name: "Nope", updated_at: new Date() },
    });
    expect(result.success).toBe(false);
  });
});

// ── Clients ───────────────────────────────────────────────────────────

describe("client:list", () => {
  it("returns paginated clients with therapist relation", async () => {
    const result = await invoke("client:list", { page: 1, pageSize: 25, sortKey: "last_name", sortDir: "asc" });
    assert(result.success);
    expect(result.data.data.length).toBeGreaterThanOrEqual(2);
    expect(result.data.data[0]).toHaveProperty("therapist");
    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(25);
    expect(result.data.total).toBeGreaterThanOrEqual(2);
  });

  it("respects pageSize", async () => {
    const result = await invoke("client:list", { page: 1, pageSize: 1, sortKey: "last_name", sortDir: "asc" });
    assert(result.success);
    expect(result.data.data).toHaveLength(1);
  });
});

describe("client:get", () => {
  it("returns a client by id with therapist relation", async () => {
    const result = await invoke("client:get", ids.clientCharlie);
    assert(result.success);
    expect(result.data).toMatchObject({
      id: ids.clientCharlie,
      first_name: "Charlie",
    });
    expect(result.data.therapist.id).toBe(ids.therapistAlice);
  });

  it("returns NOT_FOUND error for nonexistent id", async () => {
    const result = await invoke("client:get", 9999);
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.NotFound);
  });
});

describe("client:create", () => {
  it("creates a new client", async () => {
    const result = await invoke("client:create", {
      hospital_number: "H-9001",
      first_name: "Test",
      last_name: "Client",
      dob: new Date("2010-01-01T00:00:00"),
      therapist_id: ids.therapistAlice,
      start_date: new Date("2025-03-01T00:00:00"),
    });
    assert(result.success);
    expect(result.data).toMatchObject({
      hospital_number: "H-9001",
      first_name: "Test",
    });
  });

  it("returns failure on duplicate hospital_number", async () => {
    const result = await invoke("client:create", {
      hospital_number: "H-1001",
      first_name: "Dupe",
      last_name: "Client",
      dob: new Date("2010-01-01T00:00:00"),
      therapist_id: ids.therapistAlice,
      start_date: new Date("2025-03-01T00:00:00"),
    });
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.UniqueConstraint);
  });
});

describe("client:update", () => {
  it("updates an existing client", async () => {
    const current = await invoke("client:get", ids.clientDana);
    assert(current.success);
    const result = await invoke("client:update", {
      id: ids.clientDana,
      data: { phone: "07700900000", updated_at: current.data.updated_at },
    });
    assert(result.success);
    expect(result.data.phone).toBe("07700900000");
  });

  it("returns CONFLICT for stale updated_at", async () => {
    const result = await invoke("client:update", {
      id: ids.clientDana,
      data: { phone: "000", updated_at: new Date("2020-01-01T00:00:00.000Z") },
    });
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.Conflict);
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("client:update", {
      id: 9999,
      data: { phone: "000", updated_at: new Date() },
    });
    expect(result.success).toBe(false);
  });
});

describe("client:close", () => {
  it("marks client as closed and sets outcome", async () => {
    const closeDate = new Date("2026-01-15T00:00:00.000Z");
    const result = await invoke("client:close", {
      id: ids.clientCharlie,
      data: { outcome: "Improved", post_score: 8, closed_date: closeDate },
    });
    assert(result.success);
    expect(result.data.closed_date).toEqual(closeDate);
    expect(result.data.outcome).toBe("Improved");
    expect(result.data.post_score).toBe(8);
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("client:close", {
      id: 9999,
      data: { outcome: "Improved", closed_date: new Date("2026-01-15T00:00:00.000Z") },
    });
    expect(result.success).toBe(false);
  });
});

describe("client:reopen", () => {
  it("marks client as open and clears outcome and post_score", async () => {
    const result = await invoke("client:reopen", {
      id: ids.clientCharlie,
      data: {},
    });
    assert(result.success);
    expect(result.data.closed_date).toBeNull();
    expect(result.data.outcome).toBeNull();
    expect(result.data.post_score).toBeNull();
  });

  it("appends reopen notes when provided", async () => {
    // First close the client so it can be reopened with notes
    await invoke("client:close", {
      id: ids.clientDana,
      data: { outcome: "Improved", closed_date: new Date("2026-01-15T00:00:00.000Z") },
    });
    const result = await invoke("client:reopen", {
      id: ids.clientDana,
      data: { notes: "Returned for further support." },
    });
    assert(result.success);
    expect(result.data.closed_date).toBeNull();
    expect(result.data.notes).toBe("Returned for further support.");
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("client:reopen", {
      id: 9999,
      data: {},
    });
    expect(result.success).toBe(false);
  });
});

// ── Sessions ──────────────────────────────────────────────────────────

describe("session:list", () => {
  it("returns paginated sessions with client and therapist relations", async () => {
    const result = await invoke("session:list", { page: 1, pageSize: 25, sortKey: "scheduled_at", sortDir: "desc" });
    assert(result.success);
    expect(result.data.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data.data[0]).toHaveProperty("client");
    expect(result.data.data[0]).toHaveProperty("therapist");
    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(25);
    expect(result.data.total).toBeGreaterThanOrEqual(1);
  });

  it("filters by therapist id", async () => {
    const result = await invoke("session:list", {
      page: 1,
      pageSize: 25,
      sortKey: "scheduled_at",
      sortDir: "desc",
      therapistIds: [ids.therapistAlice],
    });
    assert(result.success);
    expect(result.data.data.every((s) => s.therapist_id === ids.therapistAlice)).toBe(true);
  });

  it("respects pageSize", async () => {
    const result = await invoke("session:list", { page: 1, pageSize: 1, sortKey: "scheduled_at", sortDir: "desc" });
    assert(result.success);
    expect(result.data.data).toHaveLength(1);
    expect(result.data.pageSize).toBe(1);
  });
});

describe("session:list-range", () => {
  it("returns sessions within the date range", async () => {
    const result = await invoke("session:list-range", {
      from: new Date("2026-02-01T00:00:00"),
      to: new Date("2026-02-28T23:59:59"),
    });
    assert(result.success);
    expect(result.data.some((s) => s.id === ids.sessionId)).toBe(true);
  });

  it("returns empty when no sessions in range", async () => {
    const result = await invoke("session:list-range", {
      from: new Date("2020-01-01T00:00:00"),
      to: new Date("2020-01-31T23:59:59"),
    });
    assert(result.success);
    expect(result.data).toHaveLength(0);
  });

  it("filters by therapist id", async () => {
    const result = await invoke("session:list-range", {
      from: new Date("2026-01-01T00:00:00"),
      to: new Date("2026-12-31T23:59:59"),
      therapistIds: [ids.therapistBob],
    });
    assert(result.success);
    expect(result.data.every((s) => s.therapist_id === ids.therapistBob)).toBe(true);
  });
});

describe("session:list-expected", () => {
  it("returns expected sessions for clients with a session schedule", async () => {
    // Charlie has session_day: Tuesday, session_time: 10:00
    // Use a range in the far future with no logged sessions
    const result = await invoke("session:list-expected", {
      from: new Date("2030-06-02T00:00:00"), // Monday
      to: new Date("2030-06-08T23:59:59"),   // Sunday — one week containing a Tuesday
      sortKey: "scheduled_at",
      sortDir: SortDir.Asc,
    });
    assert(result.success);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    const charlieExpected = result.data.find((e) => e.client_id === ids.clientCharlie);
    expect(charlieExpected).toBeDefined();
    expect(charlieExpected!.scheduled_at.getDay()).toBe(2); // Tuesday
    expect(charlieExpected!.scheduled_at.getHours()).toBe(10);
  });

  it("does not return expected when session already logged for that week", async () => {
    // 2030-06-04 is a Tuesday — log a session for Charlie that week
    await invoke("session:create", {
      client_id: ids.clientCharlie,
      therapist_id: ids.therapistAlice,
      scheduled_at: new Date("2030-06-04T10:00:00"),
      duration: 60,
      status: "Attended",
      session_type: "Child",
      delivery_method: "FaceToFace",
    });

    const result = await invoke("session:list-expected", {
      from: new Date("2030-06-02T00:00:00"),
      to: new Date("2030-06-08T23:59:59"),
      sortKey: "scheduled_at",
      sortDir: SortDir.Asc,
    });
    assert(result.success);
    expect(result.data.find((e) => e.client_id === ids.clientCharlie)).toBeUndefined();
  });

  it("does not return expected for clients without a session_day set", async () => {
    // Dana has no session_day
    const result = await invoke("session:list-expected", {
      from: new Date("2030-07-01T00:00:00"),
      to: new Date("2030-07-31T23:59:59"),
      sortKey: "scheduled_at",
      sortDir: SortDir.Asc,
    });
    assert(result.success);
    expect(result.data.find((e) => e.client_id === ids.clientDana)).toBeUndefined();
  });

  it("filters by therapist id", async () => {
    const result = await invoke("session:list-expected", {
      from: new Date("2030-08-01T00:00:00"),
      to: new Date("2030-08-31T23:59:59"),
      therapistIds: [ids.therapistBob],
      sortKey: "scheduled_at",
      sortDir: SortDir.Asc,
    });
    assert(result.success);
    // Charlie belongs to Alice, so nothing should appear for Bob's filter
    expect(result.data.find((e) => e.client_id === ids.clientCharlie)).toBeUndefined();
  });

  it("does not generate expected session when a logged session falls before the from date but within the same week", async () => {
    // Charlie's session day is Tuesday. Log a session on Tuesday 2031-07-08.
    // Then query from Wednesday 2031-07-09 — the Tuesday session is outside [from, to]
    // but within the same week, so no expected session should be generated.
    await invoke("session:create", {
      client_id: ids.clientCharlie,
      therapist_id: ids.therapistAlice,
      scheduled_at: new Date("2031-07-08T10:00:00"),
      duration: 60,
      status: "Attended",
      session_type: "Child",
      delivery_method: "FaceToFace",
    });

    const result = await invoke("session:list-expected", {
      from: new Date("2031-07-09T00:00:00"), // Wednesday — after the Tuesday session
      to: new Date("2031-07-13T23:59:59"),   // Sunday — same week
      sortKey: "scheduled_at",
      sortDir: SortDir.Asc,
    });
    assert(result.success);
    expect(result.data.find((e) => e.client_id === ids.clientCharlie)).toBeUndefined();
  });
});

describe("session:get", () => {
  it("returns a session by id with relations", async () => {
    const result = await invoke("session:get", ids.sessionId);
    assert(result.success);
    expect(result.data).toMatchObject({
      id: ids.sessionId,
      status: "Attended",
      session_type: "AssessmentChild",
    });
    expect(result.data.client.id).toBe(ids.clientCharlie);
    expect(result.data.therapist.id).toBe(ids.therapistAlice);
  });

  it("returns NOT_FOUND error for nonexistent id", async () => {
    const result = await invoke("session:get", 9999);
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.NotFound);
  });
});

describe("session:create", () => {
  it("creates a new session", async () => {
    const result = await invoke("session:create", {
      client_id: ids.clientCharlie,
      therapist_id: ids.therapistAlice,
      scheduled_at: new Date("2026-03-01T10:00:00"),
      duration: 60,
      status: "Scheduled",
      session_type: "Child",
      delivery_method: "Online",
    });
    assert(result.success);
    expect(result.data).toMatchObject({
      status: "Scheduled",
      session_type: "Child",
      delivery_method: "Online",
    });
    expect(result.data.id).toBeGreaterThan(0);
  });
});

describe("session:update", () => {
  it("updates an existing session", async () => {
    const current = await invoke("session:get", ids.sessionId);
    assert(current.success);
    const result = await invoke("session:update", {
      id: ids.sessionId,
      data: { notes: "Updated notes.", updated_at: current.data.updated_at },
    });
    assert(result.success);
    expect(result.data.notes).toBe("Updated notes.");
  });

  it("returns CONFLICT for stale updated_at", async () => {
    const result = await invoke("session:update", {
      id: ids.sessionId,
      data: { notes: "Stale", updated_at: new Date("2020-01-01T00:00:00.000Z") },
    });
    assert(!result.success);
    expect(result.error.code).toBe(IpcErrorCode.Conflict);
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("session:update", {
      id: 9999,
      data: { notes: "Nope", updated_at: new Date() },
    });
    expect(result.success).toBe(false);
  });
});
