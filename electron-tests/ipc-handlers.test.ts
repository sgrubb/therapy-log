import { describe, it, expect, beforeAll, afterAll, assert } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { registerIpcHandlers } from "../electron/ipc-handlers";
import type { IpcApi } from "../electron/types/ipc";
import {
  createTestPrismaClient,
  cleanupTestDb,
  seedTestData,
} from "./helpers/test-helpers";

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
  registerIpcHandlers(fakeIpcMain as never, prisma);
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
  if (!handler) throw new Error(`No handler for ${String(channel)}`);
  const result = await handler({} as never, ...(args as never[]));
  return result as IpcApi[C]["result"];
}

// ── Therapists ────────────────────────────────────────────────────────

describe("therapist:list", () => {
  it("returns all therapists", async () => {
    const result = await invoke("therapist:list");
    assert(result.success);
    expect(result.data).toHaveLength(2);
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
    expect(result.error.code).toBe("NOT_FOUND");
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
    const result = await invoke("therapist:update", {
      id: ids.therapistBob,
      data: { last_name: "Chang" },
    });
    assert(result.success);
    expect(result.data.last_name).toBe("Chang");
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("therapist:update", {
      id: 9999,
      data: { last_name: "Nope" },
    });
    expect(result.success).toBe(false);
  });
});

// ── Clients ───────────────────────────────────────────────────────────

describe("client:list", () => {
  it("returns all clients with therapist relation", async () => {
    const result = await invoke("client:list");
    assert(result.success);
    expect(result.data.length).toBeGreaterThanOrEqual(2);
    expect(result.data[0]).toHaveProperty("therapist");
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
    expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("client:create", () => {
  it("creates a new client", async () => {
    const result = await invoke("client:create", {
      hospital_number: "H-9001",
      first_name: "Test",
      last_name: "Client",
      dob: new Date("2010-01-01"),
      therapist_id: ids.therapistAlice,
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
      dob: new Date("2010-01-01"),
      therapist_id: ids.therapistAlice,
    });
    assert(!result.success);
    expect(result.error.code).toBe("UNIQUE_CONSTRAINT");
  });
});

describe("client:update", () => {
  it("updates an existing client", async () => {
    const result = await invoke("client:update", {
      id: ids.clientDana,
      data: { phone: "07700900000" },
    });
    assert(result.success);
    expect(result.data.phone).toBe("07700900000");
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("client:update", {
      id: 9999,
      data: { phone: "000" },
    });
    expect(result.success).toBe(false);
  });
});

// ── Sessions ──────────────────────────────────────────────────────────

describe("session:list", () => {
  it("returns all sessions with client and therapist relations", async () => {
    const result = await invoke("session:list");
    assert(result.success);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0]).toHaveProperty("client");
    expect(result.data[0]).toHaveProperty("therapist");
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
    expect(result.error.code).toBe("NOT_FOUND");
  });
});

describe("session:create", () => {
  it("creates a new session", async () => {
    const result = await invoke("session:create", {
      client_id: ids.clientCharlie,
      therapist_id: ids.therapistAlice,
      scheduled_at: new Date("2026-03-01T10:00:00"),
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
    const result = await invoke("session:update", {
      id: ids.sessionId,
      data: { notes: "Updated notes." },
    });
    assert(result.success);
    expect(result.data.notes).toBe("Updated notes.");
  });

  it("returns failure for nonexistent id", async () => {
    const result = await invoke("session:update", {
      id: 9999,
      data: { notes: "Nope" },
    });
    expect(result.success).toBe(false);
  });
});
