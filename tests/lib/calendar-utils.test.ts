import { differenceInMinutes } from "date-fns";
import { describe, it, expect } from "vitest";
import {
  sessionsToEvents,
  buildTherapistColorMap,
  THERAPIST_COLORS,
  isOverlapping,
  isUnconfirmed,
  isOverdue,
  expectedToEvents,
} from "@/lib/utils/calendar";
import { mockTherapists, MOCK_UPDATED_AT, MOCK_SESSION_DATE_RECENT } from "../helpers/ipc-mocks";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import type { ExpectedSession } from "@shared/types/sessions";

const clientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00"),
  start_date: new Date("2025-09-01T00:00:00"),
  address: null,
  phone: null,
  email: null,
  session_delivery_method: null as null,
  closed_date: null as Date | null,
  pre_score: null,
  post_score: null,
  outcome: null as null,
  notes: null,
  updated_at: MOCK_UPDATED_AT,
  therapist: mockTherapists[0]!,
};

const sessionBase = {
  occurred_at: null,
  delivery_method: "FaceToFace" as const,
  missed_reason: null,
  notes: null,
  updated_at: MOCK_UPDATED_AT,
  client: { ...clientBase, id: 1, first_name: "Jane", last_name: "Smith", therapist_id: 1, session_day: null, session_time: null, session_duration: null },
  therapist: mockTherapists[0]!,
};

const colorMap = new Map([[1, "#3b82f6"]]);

const session: SessionWithClientAndTherapist = {
  ...sessionBase,
  id: 1,
  client_id: 1,
  therapist_id: 1,
  scheduled_at: new Date(2026, 2, 16, 10, 0, 0),
  duration: 60,
  status: "Attended",
  session_type: "Child",
};

function makeExpected(scheduledAt: Date): ExpectedSession {
  return {
    id: "exp-1",
    client_id: 3,
    therapist_id: 1,
    scheduled_at: scheduledAt,
    duration: 60,
    client: { id: 3, first_name: "Eve", last_name: "Walker" },
    therapist: { id: 1, first_name: "Alice", last_name: "Morgan" },
  };
}

describe("buildTherapistColorMap", () => {
  it("assigns colors by selection order", () => {
    const map = buildTherapistColorMap(mockTherapists);
    expect(map.get(1)).toBe(THERAPIST_COLORS[0]);
    expect(map.get(2)).toBe(THERAPIST_COLORS[1]);
  });
});

describe("sessionsToEvents", () => {
  it("converts a session to a calendar event", () => {
    const [evt] = sessionsToEvents([session], colorMap);
    expect(evt!.id).toBe("session-1");
    expect(evt!.isExpected).toBe(false);
    expect(evt!.resourceId).toBe(1);
    expect(differenceInMinutes(evt!.end, evt!.start)).toBe(60);
    expect(evt!.color).toBe("#3b82f6");
  });
});

describe("isOverlapping / isUnconfirmed / isOverdue utility functions", () => {
  it("isOverlapping returns true when sessionId is in overlappingIds", () => {
    const [evt] = sessionsToEvents([session], colorMap);
    expect(isOverlapping(evt!, new Set([1]))).toBe(true);
    expect(isOverlapping(evt!, new Set())).toBe(false);
  });

  it("isUnconfirmed returns true when sessionId is in unconfirmedIds", () => {
    const [evt] = sessionsToEvents([session], colorMap);
    expect(isUnconfirmed(evt!, new Set([1]))).toBe(true);
    expect(isUnconfirmed(evt!, new Set())).toBe(false);
  });

  it("isOverdue returns true for expected events with start in the past", () => {
    const [evt] = expectedToEvents([makeExpected(new Date(2020, 0, 1))], colorMap, new Set([1]));
    expect(isOverdue(evt!, new Set([evt!.id]))).toBe(true);
  });

  it("isOverdue returns false for future expected events", () => {
    const [evt] = expectedToEvents([makeExpected(new Date(2099, 0, 1))], colorMap, new Set([1]));
    expect(isOverdue(evt!, new Set())).toBe(false);
  });

  it("isOverlapping and isUnconfirmed return false for expected events", () => {
    const [evt] = expectedToEvents([makeExpected(MOCK_SESSION_DATE_RECENT)], colorMap, new Set([1]));
    expect(isOverlapping(evt!, new Set([3]))).toBe(false);
    expect(isUnconfirmed(evt!, new Set([3]))).toBe(false);
  });
});
