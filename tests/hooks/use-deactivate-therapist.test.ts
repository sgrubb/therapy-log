import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useDeactivateTherapist } from "@/hooks/use-deactivate-therapist";
import { createTestQueryClient } from "../helpers/query-client";
import { clientId, therapistId } from "@shared/types/brands";
import type { Therapist } from "@shared/types/therapists";
import { FormState } from "@/lib/types/enums";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({
    success: true,
    data: {
      id: 1, first_name: "Alice", last_name: "Morgan", is_admin: true,
      start_date: new Date("2024-01-01"), deactivated_date: new Date(), updated_at: new Date(),
    },
  });
  window.electronAPI = { invoke: mockInvoke } as never;
});

const THERAPIST: Therapist = {
  id: therapistId(1),
  first_name: "Alice",
  last_name: "Morgan",
  is_admin: true,
  start_date: new Date("2024-01-01"),
  deactivated_date: null,
  updated_at: new Date("2026-01-01"),
};

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: createTestQueryClient() }, children);
}

// ── setClientReassignment ─────────────────────────────────────────────────────

describe("useDeactivateTherapist — setClientReassignment", () => {
  it("records a reassignment for a client", () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => result.current.setClientReassignment(clientId(10), therapistId(2)));
    expect(result.current.clientReassignments[clientId(10)]).toBe(therapistId(2));
  });

  it("allows setting a reassignment to null (unassign)", () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => {
      result.current.setClientReassignment(clientId(10), therapistId(2));
      result.current.setClientReassignment(clientId(10), null);
    });
    expect(result.current.clientReassignments[clientId(10)]).toBeNull();
  });

  it("tracks multiple clients independently", () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => {
      result.current.setClientReassignment(clientId(10), therapistId(2));
      result.current.setClientReassignment(clientId(11), therapistId(3));
    });
    expect(result.current.clientReassignments[clientId(10)]).toBe(therapistId(2));
    expect(result.current.clientReassignments[clientId(11)]).toBe(therapistId(3));
  });
});

// ── openDialog ────────────────────────────────────────────────────────────────

describe("useDeactivateTherapist — openDialog", () => {
  it("clears any previous reassignments when the dialog is opened", () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => result.current.setClientReassignment(clientId(10), therapistId(2)));
    act(() => result.current.openDialog());
    expect(result.current.clientReassignments).toEqual({});
  });

  it("sets showDialog to true", () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    expect(result.current.showDialog).toBe(false);
    act(() => result.current.openDialog());
    expect(result.current.showDialog).toBe(true);
  });
});

// ── handleDeactivate — payload filtering ──────────────────────────────────────

describe("useDeactivateTherapist — handleDeactivate", () => {
  it("sends only non-null reassignments to IPC", async () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => {
      result.current.openDialog();
      result.current.setClientReassignment(clientId(10), therapistId(2));
      result.current.setClientReassignment(clientId(11), null);
    });

    await act(async () => {
      await result.current.handleDeactivate();
    });

    const call = mockInvoke.mock.calls.find(([ch]: [string]) => ch === "therapist:deactivate");
    const reassignments = (call?.[1] as { data?: { client_reassignments?: unknown[] } })?.data
      ?.client_reassignments;
    expect(reassignments).toHaveLength(1);
    expect((reassignments as Array<{ client_id: number }>)[0]!.client_id).toBe(10);
  });

  it("sends an empty reassignments array when no clients are assigned", async () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => result.current.openDialog());

    await act(async () => {
      await result.current.handleDeactivate();
    });

    const call = mockInvoke.mock.calls.find(([ch]: [string]) => ch === "therapist:deactivate");
    const reassignments = (call?.[1] as { data?: { client_reassignments?: unknown[] } })?.data
      ?.client_reassignments;
    expect(reassignments).toHaveLength(0);
  });

  it("sets formState back toward Idle (dialog closes) on success", async () => {
    const { result } = renderHook(() => useDeactivateTherapist(THERAPIST), { wrapper });
    act(() => result.current.openDialog());

    await act(async () => {
      await result.current.handleDeactivate();
    });

    expect(result.current.showDialog).toBe(false);
    expect(result.current.formState).toBe(FormState.Saving);
  });
});
