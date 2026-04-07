import { describe, it, expect, vi, afterEach } from "vitest";
import { getOverlappingSessions, getUnconfirmedSessions } from "@/lib/sessions-utils";
import { MOCK_UPDATED_AT, mockTherapists } from "../helpers/ipc-mocks";
import type { SessionWithRelations } from "@/types/ipc";

const clientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00"),
  address: null,
  phone: null,
  email: null,
  session_day: null,
  session_time: null,
  session_duration: null,
  session_delivery_method: null as null,
  closed_date: null as Date | null,
  pre_score: null,
  post_score: null,
  outcome: null as null,
  notes: null,
  updated_at: MOCK_UPDATED_AT,
  start_date: new Date("2025-01-01T00:00:00"),
  therapist: mockTherapists[0]!,
};

const sessionBase = {
  occurred_at: null,
  delivery_method: "FaceToFace" as const,
  missed_reason: null,
  notes: null,
  updated_at: MOCK_UPDATED_AT,
  client: { ...clientBase, id: 1, first_name: "Jane", last_name: "Smith", therapist_id: 1 },
  therapist: mockTherapists[0]!,
};

function makeSession(overrides: Partial<SessionWithRelations> & { id: number; scheduled_at: Date }): SessionWithRelations {
  return {
    ...sessionBase,
    client_id: 1,
    therapist_id: 1,
    duration: 60,
    status: "Attended",
    session_type: "Child" as const,
    ...overrides,
  } as SessionWithRelations;
}

describe("getOverlappingSessions", () => {
  it("returns empty array when no sessions overlap", () => {
    const sessions = [
      makeSession({ id: 1, scheduled_at: new Date(2026, 2, 16, 10, 0), therapist_id: 1 }),
      makeSession({ id: 2, scheduled_at: new Date(2026, 2, 16, 11, 0), therapist_id: 1 }),
    ];
    expect(getOverlappingSessions(sessions)).toHaveLength(0);
  });

  it("detects overlapping sessions for the same therapist", () => {
    const sessions = [
      makeSession({ id: 1, scheduled_at: new Date(2026, 2, 16, 10, 0), therapist_id: 1 }),
      makeSession({ id: 2, scheduled_at: new Date(2026, 2, 16, 10, 30), therapist_id: 1 }),
    ];
    const ids = getOverlappingSessions(sessions).map((s) => s.id).sort();
    expect(ids).toEqual([1, 2]);
  });

  it("does not flag sessions for different therapists as overlapping", () => {
    const sessions = [
      makeSession({ id: 1, scheduled_at: new Date(2026, 2, 16, 10, 0), therapist_id: 1 }),
      makeSession({ id: 2, scheduled_at: new Date(2026, 2, 16, 10, 0), therapist_id: 2 }),
    ];
    expect(getOverlappingSessions(sessions)).toHaveLength(0);
  });

  it("handles multiple overlapping sessions in a group", () => {
    const sessions = [
      makeSession({ id: 1, scheduled_at: new Date(2026, 2, 16, 10, 0), therapist_id: 1 }),
      makeSession({ id: 2, scheduled_at: new Date(2026, 2, 16, 10, 15), therapist_id: 1 }),
      makeSession({ id: 3, scheduled_at: new Date(2026, 2, 16, 10, 45), therapist_id: 1 }),
    ];
    const ids = getOverlappingSessions(sessions).map((s) => s.id).sort();
    expect(ids).toEqual([1, 2, 3]);
  });

  it("does not flag adjacent (non-overlapping) sessions", () => {
    const sessions = [
      makeSession({ id: 1, scheduled_at: new Date(2026, 2, 16, 10, 0), duration: 60, therapist_id: 1 }),
      makeSession({ id: 2, scheduled_at: new Date(2026, 2, 16, 11, 0), duration: 60, therapist_id: 1 }),
    ];
    expect(getOverlappingSessions(sessions)).toHaveLength(0);
  });
});

describe("getUnconfirmedSessions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns past sessions with Scheduled status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0));

    const session = makeSession({
      id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0),
      status: "Scheduled",
    });
    expect(getUnconfirmedSessions([session])).toHaveLength(1);
  });

  it("excludes future sessions with Scheduled status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 15, 12, 0));

    const session = makeSession({
      id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0),
      status: "Scheduled",
    });
    expect(getUnconfirmedSessions([session])).toHaveLength(0);
  });

  it("excludes past sessions with Attended status", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 17, 12, 0));

    const session = makeSession({
      id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0),
      status: "Attended",
    });
    expect(getUnconfirmedSessions([session])).toHaveLength(0);
  });

  it("includes today's session if its time has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 15, 0));

    const session = makeSession({
      id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0),
      status: "Scheduled",
    });
    expect(getUnconfirmedSessions([session])).toHaveLength(1);
  });

  it("excludes today's session if its time has not passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 16, 9, 0));

    const session = makeSession({
      id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0),
      status: "Scheduled",
    });
    expect(getUnconfirmedSessions([session])).toHaveLength(0);
  });
});
