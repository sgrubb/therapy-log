// ── Response helpers ────────────────────────────────────────────────────────

export function wrapped<T>(data: T) {
  return { success: true, data };
}

export const errorResponse = {
  notFound: {
    success: false,
    error: { code: "NOT_FOUND", message: "The requested record was not found." },
  },
  uniqueConstraint: {
    success: false,
    error: { code: "UNIQUE_CONSTRAINT", message: "A record with this value already exists." },
  },
  conflict: {
    success: false,
    error: { code: "CONFLICT", message: "This record was modified by someone else." },
  },
  unknown: {
    success: false,
    error: { code: "UNKNOWN", message: "An unexpected error occurred." },
  },
};

// ── Shared timestamp ─────────────────────────────────────────────────────────

export const MOCK_UPDATED_AT = new Date("2026-01-01T00:00:00.000Z");

// Session dates anchored within the current week (Mon–Sun, weekStartsOn: 1)
// so they always fall within the default "this week" filter.
// On Monday the two dates are Mon 10:00 and Tue 10:00; otherwise today and yesterday.
import { startOfDay, subDays, addDays, setHours, isMonday } from "date-fns";
const today = startOfDay(new Date());
const recentDay = isMonday(today) ? addDays(today, 1) : today;
const olderDay = isMonday(today) ? today : subDays(today, 1);
export const MOCK_SESSION_DATE_RECENT = setHours(recentDay, 10); // 10:00
export const MOCK_SESSION_DATE_OLDER = setHours(olderDay, 14);   // 14:00

// ── Therapists ───────────────────────────────────────────────────────────────

export const mockTherapists = [
  { id: 1, first_name: "Alice", last_name: "Morgan", is_admin: true, updated_at: MOCK_UPDATED_AT },
  { id: 2, first_name: "Bob", last_name: "Chen", is_admin: false, updated_at: MOCK_UPDATED_AT },
];

export const mockTherapist = mockTherapists[0]!;

// ── Clients ──────────────────────────────────────────────────────────────────

export const mockClientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00.000Z"),
  start_date: new Date("2025-09-01T00:00:00.000Z"),
  address: null,
  phone: "07700900001",
  email: null,
  session_day: null,
  session_time: null,
  session_duration: null,
  session_delivery_method: null,
  is_closed: false,
  pre_score: null,
  post_score: null,
  outcome: null as string | null,
  notes: null as string | null,
  updated_at: MOCK_UPDATED_AT,
};

export const mockClient = {
  ...mockClientBase,
  id: 1,
  first_name: "Jane",
  last_name: "Smith",
  therapist_id: 1,
  therapist: mockTherapist,
  session_day: "Monday" as const,
  dob: new Date("2000-01-15T00:00:00.000Z"),
  address: "123 Main St",
  session_time: "10:00",
  session_duration: 60,
  session_delivery_method: "FaceToFace" as const,
};

export const mockClients = [
  mockClient,
  {
    ...mockClientBase,
    id: 2,
    first_name: "Tom",
    last_name: "Jones",
    hospital_number: "HN002",
    dob: new Date("1995-05-10T00:00:00.000Z"),
    therapist_id: 2,
    therapist: mockTherapists[1]!,
    is_closed: true,
    email: "tom@example.com",
  },
];

// ── Sessions ─────────────────────────────────────────────────────────────────

export const mockSession = {
  id: 1,
  client_id: 1,
  therapist_id: 1,
  scheduled_at: MOCK_SESSION_DATE_RECENT,
  occurred_at: null,
  duration: 60,
  status: "Attended" as const,
  session_type: "Child" as const,
  delivery_method: "FaceToFace" as const,
  missed_reason: null,
  notes: null,
  updated_at: MOCK_UPDATED_AT,
  client: {
    ...mockClientBase,
    id: 1,
    first_name: "Jane",
    last_name: "Smith",
    therapist_id: 1,
  },
  therapist: mockTherapist,
};

export const mockSessions = [
  mockSession,
  {
    id: 2,
    client_id: 2,
    therapist_id: 2,
    scheduled_at: MOCK_SESSION_DATE_OLDER,
    occurred_at: null,
    duration: 50,
    status: "DNA" as const,
    session_type: "Parent" as const,
    delivery_method: "Online" as const,
    missed_reason: "Illness" as const,
    notes: null,
    updated_at: MOCK_UPDATED_AT,
    client: {
      ...mockClientBase,
      id: 2,
      first_name: "Tom",
      last_name: "Jones",
      therapist_id: 2,
      hospital_number: "HN002",
    },
    therapist: mockTherapists[1]!,
  },
];
