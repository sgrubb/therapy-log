import { differenceInMinutes, addDays, set } from "date-fns";
import { describe, it, expect } from "vitest";
import {
  sessionsToEvents,
  generatePlaceholders,
  detectOverlaps,
  buildTherapistColorMap,
  THERAPIST_COLORS,
} from "@/lib/calendar-utils";
import { mockTherapists, MOCK_UPDATED_AT } from "../helpers/ipc-mocks";
import type { SessionWithRelations, ClientWithTherapist } from "@/types/ipc";

const clientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01"),
  start_date: new Date("2025-09-01"),
  address: null,
  phone: null,
  email: null,
  session_delivery_method: null as null,
  is_closed: false,
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

// Monday 2026-03-16 (local time — avoids UTC offset shifting the day boundary)
const MONDAY = new Date(2026, 2, 16, 0, 0, 0, 0);
// Sunday 2026-03-22
const SUNDAY = new Date(2026, 2, 22, 23, 59, 59, 999);

describe("buildTherapistColorMap", () => {
  it("assigns colors by selection order", () => {
    const map = buildTherapistColorMap(mockTherapists);
    expect(map.get(1)).toBe(THERAPIST_COLORS[0]);
    expect(map.get(2)).toBe(THERAPIST_COLORS[1]);
  });
});

describe("sessionsToEvents", () => {
  it("converts a session to a calendar event", () => {
    const colorMap = new Map([[1, "#3b82f6"]]);
    const session: SessionWithRelations = {
      ...sessionBase,
      id: 1,
      client_id: 1,
      therapist_id: 1,
      scheduled_at: new Date(2026, 2, 16, 10, 0, 0),
      duration: 60,
      status: "Attended",
      session_type: "Child",
    };
    const [evt] = sessionsToEvents([session], colorMap);
    expect(evt!.id).toBe("session-1");
    expect(evt!.isPlaceholder).toBe(false);
    expect(evt!.resourceId).toBe(1);
    expect(differenceInMinutes(evt!.end, evt!.start)).toBe(60);
    expect(evt!.color).toBe("#3b82f6");
  });
});

describe("detectOverlaps", () => {
  it("marks overlapping events for the same therapist", () => {
    const tomorrow10am = set(addDays(new Date(), 1), { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });
    const tomorrow1030 = set(addDays(new Date(), 1), { hours: 10, minutes: 30, seconds: 0, milliseconds: 0 });
    const colorMap = new Map([[1, "#3b82f6"]]);
    const sessions: SessionWithRelations[] = [
      {
        ...sessionBase,
        id: 1,
        client_id: 1,
        therapist_id: 1,
        scheduled_at: tomorrow10am,
        duration: 60,
        status: "Scheduled",
        session_type: "Child",
      },
      {
        ...sessionBase,
        id: 2,
        client_id: 1,
        therapist_id: 1,
        scheduled_at: tomorrow1030,
        duration: 60,
        status: "Scheduled",
        session_type: "Child",
      },
    ];
    const evts = detectOverlaps(sessionsToEvents(sessions, colorMap));
    expect(evts.every((e) => e.isOverlapping)).toBe(true);
  });

  it("does not mark non-overlapping events", () => {
    const colorMap = new Map([[1, "#3b82f6"]]);
    const sessions: SessionWithRelations[] = [
      {
        ...sessionBase,
        id: 1,
        client_id: 1,
        therapist_id: 1,
        scheduled_at: new Date(2026, 2, 16, 10, 0, 0),
        duration: 60,
        status: "Attended",
        session_type: "Child",
      },
      {
        ...sessionBase,
        id: 2,
        client_id: 1,
        therapist_id: 1,
        scheduled_at: new Date(2026, 2, 16, 11, 0, 0),
        duration: 60,
        status: "Attended",
        session_type: "Child",
      },
    ];
    const evts = detectOverlaps(sessionsToEvents(sessions, colorMap));
    expect(evts.every((e) => !e.isOverlapping)).toBe(true);
  });

  it("does not flag overlaps across different therapists", () => {
    const colorMap = new Map([[1, "#3b82f6"], [2, "#10b981"]]);
    const sessions: SessionWithRelations[] = [
      {
        ...sessionBase,
        id: 1,
        client_id: 1,
        therapist_id: 1,
        scheduled_at: new Date(2026, 2, 16, 10, 0, 0),
        duration: 60,
        status: "Attended",
        session_type: "Child",
      },
      {
        ...sessionBase,
        id: 2,
        client_id: 1,
        therapist_id: 2,
        scheduled_at: new Date(2026, 2, 16, 10, 30, 0),
        duration: 60,
        status: "Attended",
        session_type: "Child",
        therapist: mockTherapists[1]!,
      },
    ];
    const evts = detectOverlaps(sessionsToEvents(sessions, colorMap));
    expect(evts.every((e) => !e.isOverlapping)).toBe(true);
  });
});

describe("generatePlaceholders", () => {
  const colorMap = new Map([[1, "#3b82f6"]]);
  const selectedIds = new Set([1]);

  const client: ClientWithTherapist = {
    ...clientBase,
    id: 1,
    first_name: "Jane",
    last_name: "Smith",
    therapist_id: 1,
    session_day: "Monday",
    session_time: "10:00",
    session_duration: 60,
  };

  it("generates a placeholder when no session exists that week", () => {
    const placeholders = generatePlaceholders(
      [client],
      [],
      MONDAY,
      SUNDAY,
      selectedIds,
      colorMap,
    );
    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]!.isPlaceholder).toBe(true);
    expect(placeholders[0]!.clientId).toBe(1);
    expect(placeholders[0]!.start.getHours()).toBe(10);
  });

  it("skips a client when a session already exists that week", () => {
    const session: SessionWithRelations = {
      ...sessionBase,
      id: 1,
      client_id: 1,
      therapist_id: 1,
      scheduled_at: new Date(2026, 2, 16, 9, 0, 0),
      duration: 60,
      status: "Attended",
      session_type: "Child",
    };
    const placeholders = generatePlaceholders(
      [client],
      [session],
      MONDAY,
      SUNDAY,
      selectedIds,
      colorMap,
    );
    expect(placeholders).toHaveLength(0);
  });

  it("skips closed clients", () => {
    const closed: ClientWithTherapist = { ...client, is_closed: true };
    const placeholders = generatePlaceholders(
      [closed],
      [],
      MONDAY,
      SUNDAY,
      selectedIds,
      colorMap,
    );
    expect(placeholders).toHaveLength(0);
  });

  it("skips clients whose therapist is not in selected set", () => {
    const placeholders = generatePlaceholders(
      [client],
      [],
      MONDAY,
      SUNDAY,
      new Set([2]), // therapist 2 selected, client belongs to therapist 1
      colorMap,
    );
    expect(placeholders).toHaveLength(0);
  });

  it("skips clients without session_day or session_time", () => {
    const noDay: ClientWithTherapist = { ...client, session_day: null };
    const noTime: ClientWithTherapist = { ...client, session_time: null };
    expect(generatePlaceholders([noDay], [], MONDAY, SUNDAY, selectedIds, colorMap)).toHaveLength(0);
    expect(generatePlaceholders([noTime], [], MONDAY, SUNDAY, selectedIds, colorMap)).toHaveLength(0);
  });
});
