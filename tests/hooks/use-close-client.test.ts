import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useCloseClient } from "@/hooks/use-close-client";
import { createTestQueryClient } from "../helpers/query-client";
import { clientId, therapistId } from "@shared/types/brands";
import type { ClientWithTherapist } from "@shared/types/clients";
import { Outcome } from "@shared/types/enums";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function makeClient(notes: string | null): ClientWithTherapist {
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
    notes,
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
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: createTestQueryClient() }, children);
}

// Render, fill required fields, submit, and return the notes value sent to IPC.
async function submitClose(
  client: ClientWithTherapist,
  closingNotes: string,
): Promise<string | null | undefined> {
  // Mock the IPC response with a minimal valid client shape (numeric IDs, Dates)
  mockInvoke.mockResolvedValue({
    success: true,
    data: {
      id: 1, hospital_number: "HN001", first_name: "Jane", last_name: "Smith",
      dob: new Date("2000-01-15"), start_date: new Date("2025-09-01"),
      address: null, phone: "07700900001", email: null,
      session_day: null, session_time: null, session_duration: null, session_delivery_method: null,
      therapist_id: 1, closed_date: new Date(), pre_score: null, post_score: null,
      outcome: "Improved", notes: null, updated_at: new Date(),
      therapist: {
        id: 1, first_name: "Alice", last_name: "Morgan", is_admin: false,
        start_date: new Date("2024-01-01"), deactivated_date: null, updated_at: new Date(),
      },
    },
  });

  const hook = renderHook(() => useCloseClient(clientId(1), client), { wrapper });

  act(() => hook.result.current.openCloseDialog());
  act(() => {
    hook.result.current.set("outcome", Outcome.Improved);
    hook.result.current.set("closing_notes", closingNotes);
  });
  await act(async () => {
    await hook.result.current.handleCloseClient();
  });

  const call = mockInvoke.mock.calls.find(([ch]: [string]) => ch === "client:close");
  return (call?.[1] as { data?: { notes?: string | null } } | undefined)?.data?.notes;
}

// ── Notes concatenation logic ─────────────────────────────────────────────────

describe("useCloseClient — notes concatenation", () => {
  it("appends closing_notes to existing notes separated by double newline", async () => {
    const notes = await submitClose(makeClient("Existing notes"), "Session ended well");
    expect(notes).toBe("Existing notes\n\nSession ended well");
  });

  it("uses closing_notes alone when client has no existing notes", async () => {
    const notes = await submitClose(makeClient(null), "Final observation");
    expect(notes).toBe("Final observation");
  });

  it("preserves existing notes when closing_notes is empty", async () => {
    const notes = await submitClose(makeClient("Existing notes"), "");
    expect(notes).toBe("Existing notes");
  });

  it("sends null when both closing_notes and existing notes are absent", async () => {
    const notes = await submitClose(makeClient(null), "");
    expect(notes).toBeNull();
  });
});

// ── Dialog state ──────────────────────────────────────────────────────────────

describe("useCloseClient — dialog state", () => {
  it("openCloseDialog sets showCloseDialog to true", () => {
    const client = makeClient(null);
    const { result } = renderHook(() => useCloseClient(clientId(1), client), { wrapper });
    expect(result.current.showCloseDialog).toBe(false);
    act(() => result.current.openCloseDialog());
    expect(result.current.showCloseDialog).toBe(true);
  });

  it("dismissCloseDialog sets showCloseDialog to false", () => {
    const client = makeClient(null);
    const { result } = renderHook(() => useCloseClient(clientId(1), client), { wrapper });
    act(() => result.current.openCloseDialog());
    act(() => result.current.dismissCloseDialog());
    expect(result.current.showCloseDialog).toBe(false);
  });
});
