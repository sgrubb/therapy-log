import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useReopenClient } from "@/hooks/use-reopen-client";
import { createTestQueryClient } from "../helpers/query-client";
import { clientId, therapistId } from "@shared/types/brands";
import type { ClientWithTherapist } from "@shared/types/clients";
import { Outcome } from "@shared/types/enums";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  // ipc.reopenClient needs to parse this through clientWithTherapistSchema
  mockInvoke.mockResolvedValue({
    success: true,
    data: {
      id: 1, hospital_number: "HN001", first_name: "Jane", last_name: "Smith",
      dob: new Date("2000-01-15"), start_date: new Date("2025-09-01"),
      address: null, phone: "07700900001", email: null,
      session_day: null, session_time: null, session_duration: null, session_delivery_method: null,
      therapist_id: 1, closed_date: null, pre_score: null, post_score: null,
      outcome: null, notes: null, updated_at: new Date(),
      therapist: {
        id: 1, first_name: "Alice", last_name: "Morgan", is_admin: false,
        start_date: new Date("2024-01-01"), deactivated_date: null, updated_at: new Date(),
      },
    },
  });
  window.electronAPI = { invoke: mockInvoke } as never;
});

function makeClient(overrides?: Partial<ClientWithTherapist>): ClientWithTherapist {
  const tid = therapistId(1);
  return {
    id: clientId(1),
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
    session_duration: null,
    session_delivery_method: null,
    therapist_id: tid,
    closed_date: null,
    pre_score: null,
    post_score: null,
    outcome: null,
    notes: null,
    updated_at: new Date("2026-01-01"),
    therapist: {
      id: tid,
      first_name: "Alice",
      last_name: "Morgan",
      is_admin: false,
      start_date: new Date("2024-01-01"),
      deactivated_date: null,
      updated_at: new Date("2026-01-01"),
    },
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: createTestQueryClient() }, children);
}

async function submitReopen(
  client: ClientWithTherapist,
  reopenNotes = "",
): Promise<string | null | undefined> {
  const hook = renderHook(() => useReopenClient(clientId(1), client), { wrapper });
  act(() => hook.result.current.openReopenDialog());
  if (reopenNotes) {
    act(() => hook.result.current.set("reopen_notes", reopenNotes));
  }
  await act(async () => {
    await hook.result.current.handleReopenClient();
  });

  const call = mockInvoke.mock.calls.find(([ch]: [string]) => ch === "client:reopen");
  return (call?.[1] as { data?: { notes?: string | null } } | undefined)?.data?.notes;
}

// ── Notes format ──────────────────────────────────────────────────────────────

describe("useReopenClient — notes format", () => {
  it("includes closed line with outcome and post_score when all are set", async () => {
    const client = makeClient({
      closed_date: new Date("2026-01-15"),
      outcome: Outcome.Improved,
      post_score: 8,
      notes: null,
    });
    const notes = await submitReopen(client);
    expect(notes).toContain("Client closed on 15 Jan 2026");
    expect(notes).toContain("Outcome: Improved");
    expect(notes).toContain("Post-score: 8");
    expect(notes).toContain("Client reopened on");
  });

  it("omits outcome and post_score from closed line when they are null", async () => {
    const client = makeClient({
      closed_date: new Date("2026-01-15"),
      outcome: null,
      post_score: null,
      notes: null,
    });
    const notes = await submitReopen(client);
    expect(notes).toContain("Client closed on 15 Jan 2026");
    expect(notes).not.toContain("Outcome:");
    expect(notes).not.toContain("Post-score:");
  });

  it("omits the closed line when client has no closed_date", async () => {
    const client = makeClient({ closed_date: null, notes: null });
    const notes = await submitReopen(client);
    expect(notes).not.toContain("Client closed on");
    expect(notes).toContain("Client reopened on");
  });

  it("appends the reopen entry to existing notes with double newline", async () => {
    const client = makeClient({ closed_date: null, notes: "Earlier note" });
    const notes = await submitReopen(client);
    expect(notes).toMatch(/^Earlier note\n\n/);
  });

  it("includes reopen_notes at the end of the entry", async () => {
    const client = makeClient({ closed_date: null, notes: null });
    const notes = await submitReopen(client, "Agreed new goals");
    expect(notes).toContain("Agreed new goals");
  });
});

// ── Dialog state ──────────────────────────────────────────────────────────────

describe("useReopenClient — dialog state", () => {
  it("openReopenDialog sets showReopenDialog to true", () => {
    const { result } = renderHook(() => useReopenClient(clientId(1), makeClient()), { wrapper });
    expect(result.current.showReopenDialog).toBe(false);
    act(() => result.current.openReopenDialog());
    expect(result.current.showReopenDialog).toBe(true);
  });

  it("dismissReopenDialog sets showReopenDialog to false", () => {
    const { result } = renderHook(() => useReopenClient(clientId(1), makeClient()), { wrapper });
    act(() => result.current.openReopenDialog());
    act(() => result.current.dismissReopenDialog());
    expect(result.current.showReopenDialog).toBe(false);
  });
});
