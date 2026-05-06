import { describe, it, expect } from "vitest";
import { addMonths, format } from "date-fns";
import { sessionFormSchema, confirmSessionSchema, clientFormSchema } from "@/lib/schemas/forms";

// ── clientFormSchema ─────────────────────────────────────────────────────────

const validClient = {
  first_name: "Jane",
  last_name: "Smith",
  hospital_number: "HN001",
  dob: "2000-01-15",
  start_date: "2025-09-01",
  phone: "07700900001",
  email: "",
  session_duration: { hours: 1, minutes: 0 },
  therapist_id: "1",
};

describe("clientFormSchema — contact requirement", () => {
  it("accepts when only phone is provided", () => {
    expect(clientFormSchema.safeParse(validClient).success).toBe(true);
  });

  it("accepts when only email is provided", () => {
    const result = clientFormSchema.safeParse({ ...validClient, phone: "", email: "a@b.com" });
    expect(result.success).toBe(true);
  });

  it("accepts when both phone and email are provided", () => {
    const result = clientFormSchema.safeParse({ ...validClient, email: "a@b.com" });
    expect(result.success).toBe(true);
  });

  it("rejects when neither phone nor email is provided", () => {
    const result = clientFormSchema.safeParse({ ...validClient, phone: "", email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("At least one of phone or email is required.");
    }
  });

  it("rejects an invalid email format", () => {
    const result = clientFormSchema.safeParse({ ...validClient, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs.some((m) => m.includes("valid email"))).toBe(true);
    }
  });
});

// ── sessionFormSchema ────────────────────────────────────────────────────────

const PAST_DATE = "2020-06-15";
const PAST_TIME = "10:00";
// A date 2 months from now is always within 1 year, so it won't trigger the future-date limit.
const NEAR_FUTURE_DATE = format(addMonths(new Date(), 2), "yyyy-MM-dd");
const NEAR_FUTURE_TIME = "10:00";
// A date far enough in the future to reliably trigger the 1-year limit.
const FAR_FUTURE_DATE = "2099-06-15";
const FAR_FUTURE_TIME = "10:00";

const validFutureSession = {
  client_id: "1",
  therapist_id: "1",
  date: NEAR_FUTURE_DATE,
  time: NEAR_FUTURE_TIME,
  duration: { hours: 1, minutes: 0 },
  session_type: "Child" as const,
  delivery_method: "FaceToFace" as const,
  status: "",
  occurred_date: "",
  occurred_time: "",
  missed_reason: "",
  notes: "",
};

describe("sessionFormSchema — future session (no status required)", () => {
  it("accepts a valid future session with no status", () => {
    expect(sessionFormSchema.safeParse(validFutureSession).success).toBe(true);
  });
});

describe("sessionFormSchema — past session requires status", () => {
  it("rejects a past session with no status", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Status is required for past sessions.");
    }
  });

  it("accepts a past session with a status", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "Attended",
      occurred_date: PAST_DATE,
      occurred_time: PAST_TIME,
    });
    expect(result.success).toBe(true);
  });
});

describe("sessionFormSchema — Attended requires occurred fields", () => {
  it("rejects Attended status with no occurred_date", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "Attended",
      occurred_date: "",
      occurred_time: PAST_TIME,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Occurred date is required.");
    }
  });

  it("rejects Attended status with no occurred_time", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "Attended",
      occurred_date: PAST_DATE,
      occurred_time: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Occurred time is required.");
    }
  });
});

describe("sessionFormSchema — DNA/Cancelled requires missed_reason", () => {
  it("rejects DNA status without missed_reason", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "DNA",
      missed_reason: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Reason is required when session is missed or cancelled.");
    }
  });

  it("rejects Cancelled status without missed_reason", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "Cancelled",
      missed_reason: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Reason is required when session is missed or cancelled.");
    }
  });
});

describe("sessionFormSchema — future date limit", () => {
  it("rejects a date more than 1 year in the future", () => {
    const result = sessionFormSchema.safeParse({ ...validFutureSession, date: FAR_FUTURE_DATE });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Date cannot be more than 1 year in the future.");
    }
  });
});

describe("sessionFormSchema — occurred_date cannot be in the future", () => {
  it("rejects occurred_date in the future", () => {
    const result = sessionFormSchema.safeParse({
      ...validFutureSession,
      date: PAST_DATE,
      time: PAST_TIME,
      status: "Attended",
      occurred_date: FAR_FUTURE_DATE,
      occurred_time: FAR_FUTURE_TIME,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Occurred date and time cannot be in the future.");
    }
  });
});

// ── confirmSessionSchema ─────────────────────────────────────────────────────

const validConfirm = {
  status: "Attended" as const,
  occurred_date: PAST_DATE,
  occurred_time: PAST_TIME,
  missed_reason: "",
};

describe("confirmSessionSchema — Attended", () => {
  it("accepts Attended with valid occurred fields", () => {
    expect(confirmSessionSchema.safeParse(validConfirm).success).toBe(true);
  });

  it("rejects Attended without occurred_date", () => {
    const result = confirmSessionSchema.safeParse({ ...validConfirm, occurred_date: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Date is required.");
    }
  });

  it("rejects Attended without occurred_time", () => {
    const result = confirmSessionSchema.safeParse({ ...validConfirm, occurred_time: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Time is required.");
    }
  });
});

describe("confirmSessionSchema — DNA/Cancelled requires missed_reason", () => {
  it("rejects DNA without missed_reason", () => {
    const result = confirmSessionSchema.safeParse({
      status: "DNA",
      occurred_date: "",
      occurred_time: "",
      missed_reason: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Reason is required when session is missed or cancelled.");
    }
  });

  it("accepts DNA with a missed_reason", () => {
    const result = confirmSessionSchema.safeParse({
      status: "DNA",
      occurred_date: "",
      occurred_time: "",
      missed_reason: "Illness",
    });
    expect(result.success).toBe(true);
  });
});

describe("confirmSessionSchema — occurred in the future", () => {
  it("rejects occurred_date in the future", () => {
    const result = confirmSessionSchema.safeParse({
      ...validConfirm,
      occurred_date: FAR_FUTURE_DATE,
      occurred_time: FAR_FUTURE_TIME,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msgs = result.error.issues.map((i) => i.message);
      expect(msgs).toContain("Occurred date and time cannot be in the future.");
    }
  });
});
