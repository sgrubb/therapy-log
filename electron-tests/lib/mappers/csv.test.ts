import { describe, it, expect } from "vitest";
import {
  mapCSVRowToTherapist,
  mapCSVRowToClient,
  mapCSVRowToSession,
  mapTherapistToCSVRow,
  mapClientToCSVRow,
  mapSessionToCSVRow,
} from "../../../electron/lib/mappers/csv";
import type { Therapist, Client, Session } from "../../../generated/prisma/client";

// ── mapCSVRowToTherapist ─────────────────────────────────────────────────────

describe("mapCSVRowToTherapist", () => {
  const validRow = {
    first_name: "Alice",
    last_name: "Morgan",
    start_date: "2024-01-15",
    is_admin: "true",
  };

  it("returns a TherapistPayload on a valid row", () => {
    const result = mapCSVRowToTherapist(validRow, 2);
    expect("payload" in result).toBe(true);
    if ("payload" in result) {
      expect(result.payload.first_name).toBe("Alice");
      expect(result.payload.start_date).toBeInstanceOf(Date);
      expect(result.payload.is_admin).toBe(true);
    }
  });

  it("returns errors on an empty first_name", () => {
    const result = mapCSVRowToTherapist({ ...validRow, first_name: "" }, 3);
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.row).toBe(3);
      expect(result.errors[0]!.message).toContain('"first_name"');
    }
  });

  it("returns errors on an invalid start_date", () => {
    const result = mapCSVRowToTherapist({ ...validRow, start_date: "not-a-date" }, 4);
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"start_date"');
    }
  });
});

// ── mapCSVRowToClient ────────────────────────────────────────────────────────

const validClientRow = {
  hospital_number: "HN001",
  first_name: "Jane",
  last_name: "Smith",
  dob: "2000-01-15",
  start_date: "2025-09-01",
  therapist_first_name: "Alice",
  therapist_last_name: "Morgan",
  phone: "07700900001",
};

const therapistMap = new Map([["Alice Morgan", 1]]);

describe("mapCSVRowToClient", () => {
  it("returns a ClientPayload on a valid row with known therapist", () => {
    const result = mapCSVRowToClient(validClientRow, 2, therapistMap);
    expect("payload" in result).toBe(true);
    if ("payload" in result) {
      expect(result.payload.first_name).toBe("Jane");
      expect(result.payload.therapist_id).toBe(1);
      expect(result.payload.dob).toBeInstanceOf(Date);
    }
  });

  it("returns error when therapist is not in the map", () => {
    const result = mapCSVRowToClient(validClientRow, 2, new Map());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('therapist "Alice Morgan" not found');
    }
  });

  it("returns errors on missing hospital_number", () => {
    const result = mapCSVRowToClient({ ...validClientRow, hospital_number: "" }, 5, therapistMap);
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"hospital_number"');
    }
  });

  it("includes the row number in all errors", () => {
    const result = mapCSVRowToClient({ ...validClientRow, hospital_number: "" }, 7, therapistMap);
    if ("errors" in result) {
      expect(result.errors.every((e) => e.row === 7)).toBe(true);
    }
  });
});

// ── mapCSVRowToSession ───────────────────────────────────────────────────────

const validSessionRow = {
  client_first_name: "Jane",
  client_last_name: "Smith",
  therapist_first_name: "Alice",
  therapist_last_name: "Morgan",
  scheduled_date: "2026-02-04",
  scheduled_time: "10:00",
  duration: "60",
  session_type: "Child",
  delivery_method: "FaceToFace",
};

const clientMap = new Map([["Jane Smith", 1]]);
const therapistMapSession = new Map([["Alice Morgan", 1]]);

describe("mapCSVRowToSession — valid rows", () => {
  it("returns a SessionPayload on a minimal valid row", () => {
    const result = mapCSVRowToSession(validSessionRow, 2, clientMap, therapistMapSession);
    expect("payload" in result).toBe(true);
    if ("payload" in result) {
      expect(result.payload.client_id).toBe(1);
      expect(result.payload.therapist_id).toBe(1);
      expect(result.payload.scheduled_at).toBeInstanceOf(Date);
      expect(result.payload.occurred_at).toBeNull();
    }
  });

  it("parses occurred_date and occurred_time into occurred_at Date", () => {
    const row = {
      ...validSessionRow,
      status: "Attended",
      occurred_date: "2026-02-04",
      occurred_time: "10:05",
    };
    const result = mapCSVRowToSession(row, 2, clientMap, therapistMapSession);
    expect("payload" in result).toBe(true);
    if ("payload" in result) {
      expect(result.payload.occurred_at).toBeInstanceOf(Date);
    }
  });
});

describe("mapCSVRowToSession — lookup errors", () => {
  it("returns error when client is not in the map", () => {
    const result = mapCSVRowToSession(validSessionRow, 2, new Map(), therapistMapSession);
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('client "Jane Smith" not found');
    }
  });

  it("returns error when therapist is not in the map", () => {
    const result = mapCSVRowToSession(validSessionRow, 2, clientMap, new Map());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('therapist "Alice Morgan" not found');
    }
  });

  it("returns both errors when both client and therapist are missing", () => {
    const result = mapCSVRowToSession(validSessionRow, 2, new Map(), new Map());
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors).toHaveLength(2);
    }
  });
});

describe("mapCSVRowToSession — date/time validation", () => {
  it("rejects single-digit hour in scheduled_time", () => {
    const result = mapCSVRowToSession(
      { ...validSessionRow, scheduled_time: "9:00" },
      2,
      clientMap,
      therapistMapSession,
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"scheduled_time" must be in HH:MM 24-hour format');
    }
  });

  it("rejects occurred_date without occurred_time", () => {
    const result = mapCSVRowToSession(
      { ...validSessionRow, occurred_date: "2026-02-04" },
      2,
      clientMap,
      therapistMapSession,
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"occurred_date" and "occurred_time" must both be set');
    }
  });

  it("rejects occurred_time without occurred_date", () => {
    const result = mapCSVRowToSession(
      { ...validSessionRow, occurred_time: "10:05" },
      2,
      clientMap,
      therapistMapSession,
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"occurred_date" and "occurred_time" must both be set');
    }
  });
});

describe("mapCSVRowToSession — IPC cross-field validation", () => {
  it("rejects Attended status without occurred fields (caught by checkAgainstIpcSchema)", () => {
    const result = mapCSVRowToSession(
      { ...validSessionRow, status: "Attended" },
      2,
      clientMap,
      therapistMapSession,
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"occurred_date" and "occurred_time" are required');
    }
  });

  it("rejects DNA status without missed_reason (caught by checkAgainstIpcSchema)", () => {
    const result = mapCSVRowToSession(
      { ...validSessionRow, status: "DNA" },
      2,
      clientMap,
      therapistMapSession,
    );
    expect("errors" in result).toBe(true);
    if ("errors" in result) {
      expect(result.errors[0]!.message).toContain('"missed_reason" is required');
    }
  });
});

// ── mapTherapistToCSVRow ─────────────────────────────────────────────────────

describe("mapTherapistToCSVRow", () => {
  it("serialises a therapist to the correct column order", () => {
    const therapist = {
      id: 1,
      first_name: "Alice",
      last_name: "Morgan",
      start_date: new Date("2024-01-15T00:00:00"),
      is_admin: true,
      deactivated_date: null,
      updated_at: new Date(),
    } as Therapist;

    const row = mapTherapistToCSVRow(therapist);
    expect(row).toEqual(["Alice", "Morgan", "2024-01-15", "true"]);
  });
});

// ── mapClientToCSVRow ────────────────────────────────────────────────────────

describe("mapClientToCSVRow", () => {
  it("serialises a client with all optional fields null to empty strings", () => {
    const client = {
      id: 1,
      hospital_number: "HN001",
      first_name: "Jane",
      last_name: "Smith",
      dob: new Date("2000-01-15T00:00:00"),
      start_date: new Date("2025-09-01T00:00:00"),
      address: null,
      phone: null,
      email: null,
      session_day: null,
      session_time: null,
      session_duration: null,
      session_delivery_method: null,
      closed_date: null,
      pre_score: null,
      post_score: null,
      outcome: null,
      notes: null,
      therapist_id: 1,
      updated_at: new Date(),
      therapist: {
        id: 1,
        first_name: "Alice",
        last_name: "Morgan",
        start_date: new Date(),
        is_admin: true,
        deactivated_date: null,
        updated_at: new Date(),
      } as Therapist,
    } as Client & { therapist: Therapist };

    const row = mapClientToCSVRow(client);
    expect(row[0]).toBe("HN001");
    expect(row[1]).toBe("Jane");
    expect(row[2]).toBe("Smith");
    expect(row[5]).toBe("Alice");
    expect(row[6]).toBe("Morgan");
    // Optional fields that are null become empty strings
    expect(row[7]).toBe("");
    expect(row[8]).toBe("");
    expect(row[9]).toBe("");
  });
});

// ── mapSessionToCSVRow ───────────────────────────────────────────────────────

describe("mapSessionToCSVRow", () => {
  const baseClient = {
    id: 1,
    hospital_number: "HN001",
    first_name: "Jane",
    last_name: "Smith",
    dob: new Date("2000-01-15"),
    start_date: new Date("2025-09-01"),
    address: null,
    phone: null,
    email: null,
    session_day: null,
    session_time: null,
    session_duration: null,
    session_delivery_method: null,
    closed_date: null,
    pre_score: null,
    post_score: null,
    outcome: null,
    notes: null,
    therapist_id: 1,
    updated_at: new Date(),
  } as Client;

  const baseTherapist = {
    id: 1,
    first_name: "Alice",
    last_name: "Morgan",
    start_date: new Date("2024-01-01"),
    is_admin: true,
    deactivated_date: null,
    updated_at: new Date(),
  } as Therapist;

  it("serialises attended session with occurred_at", () => {
    const session = {
      id: 1,
      client_id: 1,
      therapist_id: 1,
      scheduled_at: new Date("2026-02-04T10:00:00"),
      occurred_at: new Date("2026-02-04T10:05:00"),
      duration: 60,
      status: "Attended",
      session_type: "Child",
      delivery_method: "FaceToFace",
      missed_reason: null,
      notes: null,
      updated_at: new Date(),
      client: baseClient,
      therapist: baseTherapist,
    } as Session & { client: Client; therapist: Therapist };

    const row = mapSessionToCSVRow(session);
    expect(row[0]).toBe("Jane");
    expect(row[1]).toBe("Smith");
    expect(row[4]).toBe("2026-02-04");
    expect(row[5]).toBe("10:00");
    expect(row[6]).toBe("60");
    expect(row[9]).toBe("Attended");
    expect(row[10]).toBe("2026-02-04");
    expect(row[11]).toBe("10:05");
    expect(row[12]).toBe("");
  });

  it("serialises unconfirmed session with empty occurred and status fields", () => {
    const session = {
      id: 2,
      client_id: 1,
      therapist_id: 1,
      scheduled_at: new Date("2026-03-01T14:00:00"),
      occurred_at: null,
      duration: 50,
      status: null,
      session_type: "Parent",
      delivery_method: "Online",
      missed_reason: null,
      notes: null,
      updated_at: new Date(),
      client: baseClient,
      therapist: baseTherapist,
    } as Session & { client: Client; therapist: Therapist };

    const row = mapSessionToCSVRow(session);
    expect(row[9]).toBe("");
    expect(row[10]).toBe("");
    expect(row[11]).toBe("");
  });
});
