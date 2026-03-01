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
  unknown: {
    success: false,
    error: { code: "UNKNOWN", message: "An unexpected error occurred." },
  },
};

// ── Therapists ───────────────────────────────────────────────────────────────

export const mockTherapists = [
  { id: 1, first_name: "Alice", last_name: "Morgan", is_admin: true },
  { id: 2, first_name: "Bob", last_name: "Chen", is_admin: false },
];

export const mockTherapist = mockTherapists[0]!;

// ── Clients ──────────────────────────────────────────────────────────────────

export const mockClientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00.000Z"),
  address: null,
  phone: "07700900001",
  email: null,
  session_day: null,
  session_time: null,
  is_closed: false,
  pre_score: null,
  post_score: null,
  outcome: null,
  notes: null,
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
  scheduled_at: new Date("2026-03-10T10:00:00.000Z"),
  occurred_at: null,
  status: "Attended" as const,
  session_type: "Child" as const,
  delivery_method: "FaceToFace" as const,
  missed_reason: null,
  notes: null,
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
    scheduled_at: new Date("2026-02-20T14:00:00.000Z"),
    occurred_at: null,
    status: "DNA" as const,
    session_type: "Parent" as const,
    delivery_method: "Online" as const,
    missed_reason: "Illness" as const,
    notes: null,
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
