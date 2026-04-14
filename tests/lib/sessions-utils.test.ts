import { describe, it, expect } from "vitest";
import {
  computeOverlappingIds,
  computeUnconfirmedIds,
  toDuration,
  fromDuration,
} from "@/lib/sessions-utils";
import { MOCK_UPDATED_AT, mockTherapists, mockClients } from "../helpers/ipc-mocks";
import type { SessionWithRelations } from "@/types/sessions";

// ── Shared fixtures ───────────────────────────────────────────────────────────

const clientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01"),
  start_date: new Date("2025-09-01"),
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
  therapist: mockTherapists[0]!,
};

function makeSession(overrides: Partial<SessionWithRelations> & Pick<SessionWithRelations, "id" | "therapist_id" | "scheduled_at" | "duration">): SessionWithRelations {
  return {
    client_id: 1,
    occurred_at: null,
    status: "Attended",
    session_type: "Child",
    delivery_method: "FaceToFace",
    missed_reason: null,
    notes: null,
    updated_at: MOCK_UPDATED_AT,
    client: { ...clientBase, id: 1, first_name: "Jane", last_name: "Smith", therapist_id: 1 },
    therapist: mockTherapists[0]!,
    ...overrides,
  };
}

// ── toDuration / fromDuration ─────────────────────────────────────────────────

describe("toDuration", () => {
  it("splits minutes into hours and remaining minutes", () => {
    expect(toDuration(90)).toEqual({ hours: 1, minutes: 30 });
    expect(toDuration(60)).toEqual({ hours: 1, minutes: 0 });
    expect(toDuration(45)).toEqual({ hours: 0, minutes: 45 });
  });
});

describe("fromDuration", () => {
  it("converts hours + minutes back to total minutes", () => {
    expect(fromDuration({ hours: 1, minutes: 30 })).toBe(90);
    expect(fromDuration({ hours: 0, minutes: 45 })).toBe(45);
  });

  it("roundtrips with toDuration", () => {
    expect(fromDuration(toDuration(75))).toBe(75);
  });
});

// ── computeOverlappingIds ─────────────────────────────────────────────────────

describe("computeOverlappingIds", () => {
  it("returns an empty set when there are no sessions", () => {
    expect(computeOverlappingIds([])).toEqual(new Set());
  });

  it("returns an empty set when a single session exists", () => {
    const s = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    expect(computeOverlappingIds([s])).toEqual(new Set());
  });

  it("returns an empty set when sessions for the same therapist do not overlap", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 1, scheduled_at: new Date("2026-06-01T11:00:00"), duration: 60 });
    expect(computeOverlappingIds([a, b])).toEqual(new Set());
  });

  it("detects overlap when sessions share the same therapist and time windows intersect", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:30:00"), duration: 60 });
    expect(computeOverlappingIds([a, b])).toEqual(new Set([1, 2]));
  });

  it("does not flag sessions for different therapists as overlapping even if times match", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 2, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    expect(computeOverlappingIds([a, b])).toEqual(new Set());
  });

  it("detects overlap when session B starts exactly at session A's start (same instant)", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    expect(computeOverlappingIds([a, b])).toEqual(new Set([1, 2]));
  });

  it("does not flag back-to-back sessions (A ends exactly when B starts)", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 1, scheduled_at: new Date("2026-06-01T11:00:00"), duration: 60 });
    expect(computeOverlappingIds([a, b])).toEqual(new Set());
  });

  it("handles three overlapping sessions for the same therapist", () => {
    const a = makeSession({ id: 1, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:00:00"), duration: 60 });
    const b = makeSession({ id: 2, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:20:00"), duration: 60 });
    const c = makeSession({ id: 3, therapist_id: 1, scheduled_at: new Date("2026-06-01T10:40:00"), duration: 60 });
    const ids = computeOverlappingIds([a, b, c]);
    expect(ids).toEqual(new Set([1, 2, 3]));
  });
});

// ── computeUnconfirmedIds ─────────────────────────────────────────────────────

describe("computeUnconfirmedIds", () => {
  const now = new Date("2026-06-15T12:00:00");

  it("returns an empty set when there are no sessions", () => {
    expect(computeUnconfirmedIds([], now)).toEqual(new Set());
  });

  it("includes Scheduled sessions whose scheduled_at is in the past", () => {
    const past = makeSession({
      id: 1,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
      status: "Scheduled",
    });
    expect(computeUnconfirmedIds([past], now)).toEqual(new Set([1]));
  });

  it("excludes Scheduled sessions in the future", () => {
    const future = makeSession({
      id: 2,
      therapist_id: 1,
      scheduled_at: new Date("2026-12-01T10:00:00"),
      duration: 60,
      status: "Scheduled",
    });
    expect(computeUnconfirmedIds([future], now)).toEqual(new Set());
  });

  it("excludes sessions with non-Scheduled status even if in the past", () => {
    const attended = makeSession({
      id: 3,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
      status: "Attended",
    });
    const dna = makeSession({
      id: 4,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
      status: "DNA",
    });
    expect(computeUnconfirmedIds([attended, dna], now)).toEqual(new Set());
  });

  it("handles a mix of past-Scheduled, future-Scheduled, and Attended", () => {
    const pastScheduled = makeSession({
      id: 1,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
      status: "Scheduled",
    });
    const futureScheduled = makeSession({
      id: 2,
      therapist_id: 1,
      scheduled_at: new Date("2026-12-01T10:00:00"),
      duration: 60,
      status: "Scheduled",
    });
    const attended = makeSession({
      id: 3,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
      status: "Attended",
    });
    expect(computeUnconfirmedIds([pastScheduled, futureScheduled, attended], now)).toEqual(new Set([1]));
  });
});

