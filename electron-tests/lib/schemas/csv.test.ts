import { describe, it, expect } from "vitest";
import { therapistRowSchema, clientRowSchema, sessionRowSchema } from "../../../electron/lib/schemas/csv";

// ── therapistRowSchema ───────────────────────────────────────────────────────

describe("therapistRowSchema", () => {
  const valid = {
    first_name: "Alice",
    last_name: "Morgan",
    start_date: "2024-01-15",
    is_admin: "true",
  };

  it("parses a valid row", () => {
    const result = therapistRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.first_name).toBe("Alice");
      expect(result.data.start_date).toBeInstanceOf(Date);
      expect(result.data.is_admin).toBe(true);
    }
  });

  it("parses is_admin as false for absent/empty value", () => {
    const result = therapistRowSchema.safeParse({ ...valid, is_admin: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_admin).toBe(false);
    }
  });

  it("parses is_admin '1' as true", () => {
    const result = therapistRowSchema.safeParse({ ...valid, is_admin: "1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_admin).toBe(true);
    }
  });

  it("rejects missing first_name", () => {
    const result = therapistRowSchema.safeParse({ ...valid, first_name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('"first_name" is required');
    }
  });

  it("rejects an invalid start_date", () => {
    const result = therapistRowSchema.safeParse({ ...valid, start_date: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toMatch(/"start_date"/);
    }
  });
});

// ── clientRowSchema ──────────────────────────────────────────────────────────

describe("clientRowSchema — required fields", () => {
  const valid = {
    hospital_number: "HN001",
    first_name: "Jane",
    last_name: "Smith",
    dob: "2000-01-15",
    start_date: "2025-09-01",
    therapist_first_name: "Alice",
    therapist_last_name: "Morgan",
  };

  it("parses a minimal valid row", () => {
    const result = clientRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing hospital_number", () => {
    const result = clientRowSchema.safeParse({ ...valid, hospital_number: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('"hospital_number" is required');
    }
  });

  it("rejects an invalid dob format", () => {
    const result = clientRowSchema.safeParse({ ...valid, dob: "15/01/2000" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toMatch(/"dob"/);
    }
  });
});

describe("clientRowSchema — optional fields", () => {
  const valid = {
    hospital_number: "HN001",
    first_name: "Jane",
    last_name: "Smith",
    dob: "2000-01-15",
    start_date: "2025-09-01",
    therapist_first_name: "Alice",
    therapist_last_name: "Morgan",
  };

  it("coerces absent optional fields to null", () => {
    const result = clientRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.address).toBeNull();
      expect(result.data.session_duration).toBeNull();
      expect(result.data.session_day).toBeNull();
    }
  });

  it("rejects an invalid session_day enum value", () => {
    const result = clientRowSchema.safeParse({ ...valid, session_day: "Someday" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"session_day" must be one of:');
      expect(result.error.issues[0]!.message).toContain('"Monday"');
    }
  });

  it("rejects a non-positive session_duration", () => {
    const result = clientRowSchema.safeParse({ ...valid, session_duration: "0" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('"session_duration" must be a positive whole number');
    }
  });

  it("accepts a valid outcome enum value", () => {
    const result = clientRowSchema.safeParse({ ...valid, outcome: "Improved" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.outcome).toBe("Improved");
    }
  });

  it("rejects an invalid outcome enum value with quoted list", () => {
    const result = clientRowSchema.safeParse({ ...valid, outcome: "Better" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"outcome" must be one of:');
      expect(result.error.issues[0]!.message).toContain('"Improved"');
    }
  });

  it("rejects an invalid closed_date value", () => {
    const result = clientRowSchema.safeParse({ ...valid, closed_date: "not-a-date" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"closed_date"');
    }
  });
});

// ── sessionRowSchema ─────────────────────────────────────────────────────────

describe("sessionRowSchema — required fields", () => {
  const valid = {
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

  it("parses a minimal valid row", () => {
    const result = sessionRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects single-digit hour in scheduled_time", () => {
    const result = sessionRowSchema.safeParse({ ...valid, scheduled_time: "9:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"scheduled_time" must be in HH:MM 24-hour format');
    }
  });

  it("rejects a non-ISO scheduled_date", () => {
    const result = sessionRowSchema.safeParse({ ...valid, scheduled_date: "04/02/2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"scheduled_date" must be in YYYY-MM-DD format');
    }
  });

  it("rejects invalid session_type", () => {
    const result = sessionRowSchema.safeParse({ ...valid, session_type: "Unknown" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"session_type" must be one of:');
    }
  });

  it("rejects a non-positive duration", () => {
    const result = sessionRowSchema.safeParse({ ...valid, duration: "-10" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toBe('"duration" must be a positive whole number');
    }
  });
});

describe("sessionRowSchema — optional fields", () => {
  const valid = {
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

  it("accepts absent optional fields and coerces to null", () => {
    const result = sessionRowSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBeNull();
      expect(result.data.occurred_date).toBeNull();
      expect(result.data.occurred_time).toBeNull();
      expect(result.data.missed_reason).toBeNull();
    }
  });

  it("accepts valid optional occurred_date in YYYY-MM-DD format", () => {
    const result = sessionRowSchema.safeParse({ ...valid, occurred_date: "2026-02-04" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurred_date).toBe("2026-02-04");
    }
  });

  it("rejects invalid optional occurred_date format", () => {
    const result = sessionRowSchema.safeParse({ ...valid, occurred_date: "02-04-2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"occurred_date" must be in YYYY-MM-DD format');
    }
  });

  it("rejects single-digit hour in optional occurred_time", () => {
    const result = sessionRowSchema.safeParse({ ...valid, occurred_time: "9:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"occurred_time" must be in HH:MM 24-hour format');
    }
  });

  it("rejects invalid missed_reason with quoted options", () => {
    const result = sessionRowSchema.safeParse({ ...valid, missed_reason: "Forgot" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.message).toContain('"missed_reason" must be one of:');
      expect(result.error.issues[0]!.message).toContain('"Illness"');
    }
  });
});
