import { describe, it, expect } from "vitest";
import { sessionCreateSchema } from "@shared/schemas/sessions";

// Base fields required by sessionCreateSchema that are not under test here.
const BASE = {
  client_id: 1,
  therapist_id: 1,
  scheduled_at: "2026-02-04T10:00:00",
  duration: 60,
  session_type: "Child",
  delivery_method: "FaceToFace",
} as const;

const OCCURRED = new Date("2026-02-04T10:05:00");

function parse(overrides: Record<string, unknown>) {
  return sessionCreateSchema.safeParse({ ...BASE, ...overrides });
}

function errors(result: ReturnType<typeof parse>): string[] {
  if (result.success) {
    return [];
  }
  return result.error.issues.map((i) => i.message);
}

// ── status === undefined (omitted) ───────────────────────────────────────────

describe("validateSessionStatusFields — status omitted", () => {
  it("accepts any occurred_at when status is not provided", () => {
    expect(parse({ occurred_at: OCCURRED }).success).toBe(true);
  });

  it("accepts any missed_reason when status is not provided", () => {
    expect(parse({ missed_reason: "Illness" }).success).toBe(true);
  });
});

// ── status === "Attended" ────────────────────────────────────────────────────

describe("validateSessionStatusFields — Attended", () => {
  it("accepts occurred_at set and no missed_reason", () => {
    expect(parse({ status: "Attended", occurred_at: OCCURRED, missed_reason: null }).success).toBe(true);
  });

  it("rejects when occurred_at is null", () => {
    const result = parse({ status: "Attended", occurred_at: null, missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" are required when status is "Attended".',
    );
  });

  it("rejects when occurred_at is not provided", () => {
    const result = parse({ status: "Attended", missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" are required when status is "Attended".',
    );
  });

  it("rejects when missed_reason is set", () => {
    const result = parse({ status: "Attended", occurred_at: OCCURRED, missed_reason: "Illness" });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain('"missed_reason" must not be set when status is "Attended".');
  });

  it("can surface both errors when occurred_at missing and missed_reason set", () => {
    const result = parse({ status: "Attended", occurred_at: null, missed_reason: "Illness" });
    expect(result.success).toBe(false);
    const msgs = errors(result);
    expect(msgs).toContain(
      '"occurred_date" and "occurred_time" are required when status is "Attended".',
    );
    expect(msgs).toContain('"missed_reason" must not be set when status is "Attended".');
  });
});

// ── status === "DNA" ─────────────────────────────────────────────────────────

describe("validateSessionStatusFields — DNA", () => {
  it("accepts null occurred_at and a missed_reason", () => {
    expect(parse({ status: "DNA", occurred_at: null, missed_reason: "Illness" }).success).toBe(true);
  });

  it("rejects when missed_reason is absent", () => {
    const result = parse({ status: "DNA", occurred_at: null, missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"missed_reason" is required when status is "DNA" or "Cancelled".',
    );
  });

  it("rejects when occurred_at is set", () => {
    const result = parse({ status: "DNA", occurred_at: OCCURRED, missed_reason: "Illness" });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" must not be set when status is "DNA".',
    );
  });
});

// ── status === "Cancelled" ───────────────────────────────────────────────────

describe("validateSessionStatusFields — Cancelled", () => {
  it("accepts null occurred_at and a missed_reason", () => {
    expect(parse({ status: "Cancelled", occurred_at: null, missed_reason: "Holiday" }).success).toBe(true);
  });

  it("rejects when missed_reason is absent", () => {
    const result = parse({ status: "Cancelled", occurred_at: null, missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"missed_reason" is required when status is "DNA" or "Cancelled".',
    );
  });

  it("rejects when occurred_at is set", () => {
    const result = parse({ status: "Cancelled", occurred_at: OCCURRED, missed_reason: "Holiday" });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" must not be set when status is "Cancelled".',
    );
  });
});

// ── status === "Rescheduled" ─────────────────────────────────────────────────

describe("validateSessionStatusFields — Rescheduled", () => {
  it("accepts null occurred_at and no missed_reason", () => {
    expect(parse({ status: "Rescheduled", occurred_at: null, missed_reason: null }).success).toBe(true);
  });

  it("accepts null occurred_at with a missed_reason (allowed but not required)", () => {
    expect(parse({ status: "Rescheduled", occurred_at: null, missed_reason: "Illness" }).success).toBe(true);
  });

  it("rejects when occurred_at is set", () => {
    const result = parse({ status: "Rescheduled", occurred_at: OCCURRED, missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" must not be set when status is "Rescheduled".',
    );
  });
});

// ── status === null (unconfirmed) ────────────────────────────────────────────

describe("validateSessionStatusFields — null (unconfirmed)", () => {
  it("accepts null occurred_at and null missed_reason", () => {
    expect(parse({ status: null, occurred_at: null, missed_reason: null }).success).toBe(true);
  });

  it("rejects when occurred_at is set", () => {
    const result = parse({ status: null, occurred_at: OCCURRED, missed_reason: null });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain(
      '"occurred_date" and "occurred_time" must not be set when session is unconfirmed.',
    );
  });

  it("rejects when missed_reason is set", () => {
    const result = parse({ status: null, occurred_at: null, missed_reason: "Illness" });
    expect(result.success).toBe(false);
    expect(errors(result)).toContain('"missed_reason" must not be set when session is unconfirmed.');
  });
});
