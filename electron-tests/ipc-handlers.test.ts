import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { PrismaClient } from "../generated/prisma/client";
import { registerIpcHandlers } from "../electron/ipc-handlers";
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

// Helper to invoke a handler the same way Electron would
async function invoke(channel: string, ...args: unknown[]): Promise<unknown> {
  const handler = handlers[channel];
  if (!handler) throw new Error(`No handler for channel: ${channel}`);
  return handler({}, ...args);
}

// ── Therapists ────────────────────────────────────────────────────────

describe("therapist:list", () => {
  it("returns all therapists", async () => {
    const result = await invoke("therapist:list");
    expect(result).toHaveLength(2);
  });
});

describe("therapist:get", () => {
  it("returns a therapist by id", async () => {
    const result = (await invoke("therapist:get", ids.therapistAlice)) as {
      id: number;
      first_name: string;
    };
    expect(result).toMatchObject({
      id: ids.therapistAlice,
      first_name: "Alice",
      last_name: "Morgan",
      is_admin: true,
    });
  });

  it("returns null for nonexistent id", async () => {
    const result = await invoke("therapist:get", 9999);
    expect(result).toBeNull();
  });
});

describe("therapist:create", () => {
  it("creates a new therapist", async () => {
    const result = (await invoke("therapist:create", {
      first_name: "Carol",
      last_name: "Smith",
    })) as { id: number; first_name: string };
    expect(result).toMatchObject({
      first_name: "Carol",
      last_name: "Smith",
      is_admin: false,
    });
    expect(result.id).toBeGreaterThan(0);
  });
});

describe("therapist:update", () => {
  it("updates an existing therapist", async () => {
    const result = (await invoke("therapist:update", {
      id: ids.therapistBob,
      data: { last_name: "Chang" },
    })) as { last_name: string };
    expect(result.last_name).toBe("Chang");
  });

  it("throws for nonexistent id", async () => {
    await expect(
      invoke("therapist:update", {
        id: 9999,
        data: { last_name: "Nope" },
      }),
    ).rejects.toThrow();
  });
});

// ── Clients ───────────────────────────────────────────────────────────

describe("client:list", () => {
  it("returns all clients with therapist relation", async () => {
    const result = (await invoke("client:list")) as Array<{
      therapist: unknown;
    }>;
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0]).toHaveProperty("therapist");
  });
});

describe("client:get", () => {
  it("returns a client by id with therapist relation", async () => {
    const result = (await invoke("client:get", ids.clientCharlie)) as {
      id: number;
      first_name: string;
      therapist: { id: number };
    };
    expect(result).toMatchObject({
      id: ids.clientCharlie,
      first_name: "Charlie",
    });
    expect(result.therapist.id).toBe(ids.therapistAlice);
  });

  it("returns null for nonexistent id", async () => {
    const result = await invoke("client:get", 9999);
    expect(result).toBeNull();
  });
});

describe("client:create", () => {
  it("creates a new client", async () => {
    const result = (await invoke("client:create", {
      hospital_number: "H-9001",
      first_name: "Test",
      last_name: "Client",
      dob: new Date("2010-01-01"),
      therapist_id: ids.therapistAlice,
    })) as { hospital_number: string };
    expect(result).toMatchObject({
      hospital_number: "H-9001",
      first_name: "Test",
    });
  });

  it("throws on duplicate hospital_number", async () => {
    await expect(
      invoke("client:create", {
        hospital_number: "H-1001",
        first_name: "Dupe",
        last_name: "Client",
        dob: new Date("2010-01-01"),
        therapist_id: ids.therapistAlice,
      }),
    ).rejects.toThrow();
  });
});

describe("client:update", () => {
  it("updates an existing client", async () => {
    const result = (await invoke("client:update", {
      id: ids.clientDana,
      data: { phone: "07700900000" },
    })) as { phone: string };
    expect(result.phone).toBe("07700900000");
  });

  it("throws for nonexistent id", async () => {
    await expect(
      invoke("client:update", {
        id: 9999,
        data: { phone: "000" },
      }),
    ).rejects.toThrow();
  });
});

// ── Sessions ──────────────────────────────────────────────────────────

describe("session:list", () => {
  it("returns all sessions with client and therapist relations", async () => {
    const result = (await invoke("session:list")) as Array<{
      client: unknown;
      therapist: unknown;
    }>;
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]).toHaveProperty("client");
    expect(result[0]).toHaveProperty("therapist");
  });
});

describe("session:get", () => {
  it("returns a session by id with relations", async () => {
    const result = (await invoke("session:get", ids.sessionId)) as {
      id: number;
      status: string;
      client: { id: number };
      therapist: { id: number };
    };
    expect(result).toMatchObject({
      id: ids.sessionId,
      status: "Attended",
      session_type: "AssessmentChild",
    });
    expect(result.client.id).toBe(ids.clientCharlie);
    expect(result.therapist.id).toBe(ids.therapistAlice);
  });

  it("returns null for nonexistent id", async () => {
    const result = await invoke("session:get", 9999);
    expect(result).toBeNull();
  });
});

describe("session:create", () => {
  it("creates a new session", async () => {
    const result = (await invoke("session:create", {
      client_id: ids.clientCharlie,
      therapist_id: ids.therapistAlice,
      scheduled_at: new Date("2026-03-01T10:00:00"),
      status: "Scheduled",
      session_type: "Child",
      delivery_method: "Online",
    })) as { id: number; status: string };
    expect(result).toMatchObject({
      status: "Scheduled",
      session_type: "Child",
      delivery_method: "Online",
    });
    expect(result.id).toBeGreaterThan(0);
  });
});

describe("session:update", () => {
  it("updates an existing session", async () => {
    const result = (await invoke("session:update", {
      id: ids.sessionId,
      data: { notes: "Updated notes." },
    })) as { notes: string };
    expect(result.notes).toBe("Updated notes.");
  });

  it("throws for nonexistent id", async () => {
    await expect(
      invoke("session:update", {
        id: 9999,
        data: { notes: "Nope" },
      }),
    ).rejects.toThrow();
  });
});
