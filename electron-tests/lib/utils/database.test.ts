import { describe, it, expect } from "vitest";
import { TherapistStatus, ClientStatus, SessionStatus } from "@shared/types/enums";
import {
  buildTherapistWhere,
  buildClientWhere,
  buildSessionWhere,
} from "../../../electron/lib/utils/database";

// ── buildTherapistWhere ──────────────────────────────────────────────────────

describe("buildTherapistWhere", () => {
  it("filters active therapists by null deactivated_date", () => {
    expect(buildTherapistWhere(TherapistStatus.Active)).toEqual({ deactivated_date: null });
  });

  it("filters inactive therapists by non-null deactivated_date", () => {
    expect(buildTherapistWhere(TherapistStatus.Inactive)).toEqual({
      deactivated_date: { not: null },
    });
  });

  it("returns empty object for All", () => {
    expect(buildTherapistWhere(TherapistStatus.All)).toEqual({});
  });
});

// ── buildClientWhere ─────────────────────────────────────────────────────────

describe("buildClientWhere — status filter", () => {
  it("filters open clients by null closed_date", () => {
    expect(buildClientWhere({ status: ClientStatus.Open })).toEqual({ closed_date: null });
  });

  it("filters closed clients by non-null closed_date", () => {
    expect(buildClientWhere({ status: ClientStatus.Closed })).toEqual({
      closed_date: { not: null },
    });
  });

  it("omits closed_date filter for All", () => {
    const result = buildClientWhere({ status: ClientStatus.All });
    expect(result).not.toHaveProperty("closed_date");
  });

  it("omits closed_date filter when status is not provided", () => {
    const result = buildClientWhere({});
    expect(result).not.toHaveProperty("closed_date");
  });
});

describe("buildClientWhere — therapistId filter", () => {
  it("filters by therapist_id when provided", () => {
    expect(buildClientWhere({ therapistId: 5 })).toMatchObject({ therapist_id: 5 });
  });

  it("omits therapist_id when null", () => {
    const result = buildClientWhere({ therapistId: null });
    expect(result).not.toHaveProperty("therapist_id");
  });

  it("omits therapist_id when not provided", () => {
    const result = buildClientWhere({});
    expect(result).not.toHaveProperty("therapist_id");
  });
});

describe("buildClientWhere — search filter", () => {
  it("adds OR clause for first_name, last_name, hospital_number when search is provided", () => {
    const result = buildClientWhere({ search: "alice" });
    expect(result).toMatchObject({
      OR: [
        { first_name: { contains: "alice" } },
        { last_name: { contains: "alice" } },
        { hospital_number: { contains: "alice" } },
      ],
    });
  });

  it("omits OR clause when search is empty string", () => {
    const result = buildClientWhere({ search: "" });
    expect(result).not.toHaveProperty("OR");
  });

  it("omits OR clause when search is not provided", () => {
    const result = buildClientWhere({});
    expect(result).not.toHaveProperty("OR");
  });
});

describe("buildClientWhere — combined filters", () => {
  it("combines status, therapistId, and search", () => {
    const result = buildClientWhere({
      status: ClientStatus.Open,
      therapistId: 3,
      search: "bob",
    });
    expect(result).toMatchObject({
      closed_date: null,
      therapist_id: 3,
      OR: expect.any(Array),
    });
  });
});

// ── buildSessionWhere ────────────────────────────────────────────────────────

describe("buildSessionWhere — date range filter", () => {
  const from = new Date("2026-01-01");
  const to = new Date("2026-01-31");

  it("adds gte when only from is provided", () => {
    expect(buildSessionWhere({ from })).toEqual({ scheduled_at: { gte: from } });
  });

  it("adds lte when only to is provided", () => {
    expect(buildSessionWhere({ to })).toEqual({ scheduled_at: { lte: to } });
  });

  it("adds both gte and lte when from and to are provided", () => {
    expect(buildSessionWhere({ from, to })).toEqual({
      scheduled_at: { gte: from, lte: to },
    });
  });

  it("omits scheduled_at when neither from nor to is provided", () => {
    expect(buildSessionWhere({})).not.toHaveProperty("scheduled_at");
  });
});

describe("buildSessionWhere — therapistIds filter", () => {
  it("adds therapist_id in-list when therapistIds has entries", () => {
    expect(buildSessionWhere({ therapistIds: [1, 2] })).toEqual({
      therapist_id: { in: [1, 2] },
    });
  });

  it("omits therapist_id when therapistIds is empty", () => {
    expect(buildSessionWhere({ therapistIds: [] })).not.toHaveProperty("therapist_id");
  });

  it("omits therapist_id when therapistIds is not provided", () => {
    expect(buildSessionWhere({})).not.toHaveProperty("therapist_id");
  });
});

describe("buildSessionWhere — clientId filter", () => {
  it("adds client_id when provided", () => {
    expect(buildSessionWhere({ clientId: 7 })).toMatchObject({ client_id: 7 });
  });

  it("omits client_id when not provided", () => {
    expect(buildSessionWhere({})).not.toHaveProperty("client_id");
  });
});

describe("buildSessionWhere — status filter", () => {
  it("adds status filter for a specific status", () => {
    expect(buildSessionWhere({ status: SessionStatus.Attended })).toMatchObject({
      status: SessionStatus.Attended,
    });
  });

  it("adds status: null when status is explicitly null", () => {
    expect(buildSessionWhere({ status: null })).toMatchObject({ status: null });
  });

  it("omits status when not provided", () => {
    expect(buildSessionWhere({})).not.toHaveProperty("status");
  });
});
