import { describe, it, expect } from "vitest";
import { clientCreateSchema, clientUpdateSchema } from "../../shared/schemas/clients";

const BASE = {
  hospital_number: "HN001",
  first_name: "Jane",
  last_name: "Smith",
  dob: "2000-01-15",
  start_date: "2025-09-01",
  therapist_id: 1,
};

// ── phone / email ─────────────────────────────────────────────────────────────

describe("clientCreateSchema — phone/email", () => {
  it("accepts when phone is provided", () => {
    expect(clientCreateSchema.safeParse({ ...BASE, phone: "07700900001" }).success).toBe(true);
  });

  it("accepts when email is provided", () => {
    expect(clientCreateSchema.safeParse({ ...BASE, email: "jane@example.com" }).success).toBe(true);
  });

  it("accepts when both phone and email are provided", () => {
    expect(
      clientCreateSchema.safeParse({ ...BASE, phone: "07700900001", email: "jane@example.com" }).success,
    ).toBe(true);
  });

  it("rejects when both phone and email are empty strings", () => {
    const result = clientCreateSchema.safeParse({ ...BASE, phone: "", email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("At least one of phone or email"))).toBe(true);
    }
  });

  it("rejects when both phone and email are null", () => {
    const result = clientCreateSchema.safeParse({ ...BASE, phone: null, email: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("At least one of phone or email"))).toBe(true);
    }
  });

  it("skips the check when neither phone nor email is provided at all", () => {
    // Both keys absent → validateClientFields short-circuits
    expect(clientCreateSchema.safeParse(BASE).success).toBe(true);
  });
});

// ── closed_date / outcome ─────────────────────────────────────────────────────

describe("clientCreateSchema — closed_date / outcome", () => {
  const WITH_PHONE = { ...BASE, phone: "07700900001" };

  it("rejects outcome when closed_date is null (client open)", () => {
    const result = clientCreateSchema.safeParse({ ...WITH_PHONE, closed_date: null, outcome: "Improved" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("outcome must not be set"))).toBe(true);
    }
  });

  it("rejects post_score when closed_date is null (client open)", () => {
    const result = clientCreateSchema.safeParse({ ...WITH_PHONE, closed_date: null, post_score: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("post_score must not be set"))).toBe(true);
    }
  });

  it("rejects when closed_date is set but outcome is absent", () => {
    const result = clientCreateSchema.safeParse({ ...WITH_PHONE, closed_date: "2026-01-15", outcome: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("outcome is required"))).toBe(true);
    }
  });

  it("accepts when closed_date is set and outcome is provided", () => {
    expect(
      clientCreateSchema.safeParse({ ...WITH_PHONE, closed_date: "2026-01-15", outcome: "Improved" }).success,
    ).toBe(true);
  });

  it("skips closed_date check when closed_date is absent", () => {
    // omitting closed_date entirely → validateClientFields returns early
    expect(clientCreateSchema.safeParse(WITH_PHONE).success).toBe(true);
  });
});

// ── clientUpdateSchema — partial updates ─────────────────────────────────────

describe("clientUpdateSchema — partial update", () => {
  it("skips phone/email check when neither key is present (name-only update)", () => {
    const result = clientUpdateSchema.safeParse({ updated_at: new Date(), first_name: "Janet" });
    expect(result.success).toBe(true);
  });

  it("enforces phone/email rule when at least one key is present", () => {
    const result = clientUpdateSchema.safeParse({ updated_at: new Date(), phone: "", email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("At least one of phone or email"))).toBe(true);
    }
  });

  it("skips closed_date check when closed_date is absent (partial update)", () => {
    const result = clientUpdateSchema.safeParse({ updated_at: new Date(), first_name: "Janet" });
    expect(result.success).toBe(true);
  });
});
