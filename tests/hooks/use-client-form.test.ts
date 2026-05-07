import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Suspense, createElement } from "react";
import { useClientForm } from "@/hooks/use-client-form";
import { createTestQueryClient } from "../helpers/query-client";
import { clientId } from "@shared/types/brands";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ success: true, data: null });
  window.electronAPI = { invoke: mockInvoke } as never;
});

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MemoryRouter, null, createElement(Suspense, { fallback: null }, children)),
  );
}

async function renderSettledHook(clientIdArg?: Parameters<typeof useClientForm>[0]) {
  const hook = renderHook(() => useClientForm(clientIdArg), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.form).toBeDefined();
  });
  return hook;
}

// Raw data matching clientWithTherapistSchema expectations (numeric IDs, Date objects)
const RAW_CLIENT = {
  id: 1,
  hospital_number: "HN001",
  first_name: "Jane",
  last_name: "Smith",
  dob: new Date("2000-01-15"),
  start_date: new Date("2025-09-01"),
  address: null,
  phone: "07700900001",
  email: null,
  session_day: null,
  session_time: null,
  session_duration: 90,
  session_delivery_method: null,
  therapist_id: 1,
  closed_date: null,
  pre_score: null,
  post_score: null,
  outcome: null,
  notes: "Prior notes",
  updated_at: new Date("2026-01-01"),
  therapist: {
    id: 1,
    first_name: "Alice",
    last_name: "Morgan",
    is_admin: true,
    start_date: new Date("2024-01-01"),
    deactivated_date: null,
    updated_at: new Date("2026-01-01"),
  },
};

// ── New client ────────────────────────────────────────────────────────────────

describe("useClientForm — new client", () => {
  it("initialises core fields to empty strings", async () => {
    const { result } = await renderSettledHook();
    expect(result.current.form.first_name).toBe("");
    expect(result.current.form.hospital_number).toBe("");
    expect(result.current.form.phone).toBe("");
  });

  it("has isEdit = false", async () => {
    const { result } = await renderSettledHook();
    expect(result.current.isEdit).toBe(false);
  });

  it("has isClosed = false", async () => {
    const { result } = await renderSettledHook();
    expect(result.current.isClosed).toBe(false);
  });
});

// ── Existing client ───────────────────────────────────────────────────────────

describe("useClientForm — existing client", () => {
  beforeEach(() => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "client:get") return Promise.resolve({ success: true, data: RAW_CLIENT });
      return Promise.resolve({ success: true, data: null });
    });
  });

  it("populates text fields from the fetched client", async () => {
    const { result } = await renderSettledHook(clientId(1));
    expect(result.current.form.first_name).toBe("Jane");
    expect(result.current.form.hospital_number).toBe("HN001");
    expect(result.current.form.phone).toBe("07700900001");
  });

  it("converts dob Date to YYYY-MM-DD string", async () => {
    const { result } = await renderSettledHook(clientId(1));
    expect(result.current.form.dob).toBe("2000-01-15");
  });

  it("converts session_duration minutes to {hours, minutes} object", async () => {
    const { result } = await renderSettledHook(clientId(1));
    // 90 minutes → 1 hour 30 minutes
    expect(result.current.form.session_duration).toEqual({ hours: 1, minutes: 30 });
  });

  it("has isEdit = true", async () => {
    const { result } = await renderSettledHook(clientId(1));
    expect(result.current.isEdit).toBe(true);
  });

  it("has isClosed = false when client has no closed_date", async () => {
    const { result } = await renderSettledHook(clientId(1));
    expect(result.current.isClosed).toBe(false);
  });

  it("has isClosed = true when client has a closed_date", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "client:get") {
        return Promise.resolve({
          success: true,
          data: { ...RAW_CLIENT, closed_date: new Date("2026-01-15"), outcome: "Improved" },
        });
      }
      return Promise.resolve({ success: true, data: null });
    });
    const { result } = await renderSettledHook(clientId(1));
    expect(result.current.isClosed).toBe(true);
  });
});
