import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useConfirmSession } from "@/hooks/use-confirm-session";
import { createTestQueryClient } from "../helpers/query-client";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import { clientId, sessionId, therapistId } from "@shared/types/brands";
import type { SessionStatus, MissedReason } from "@shared/types/enums";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ success: true, data: null });
  window.electronAPI = { invoke: mockInvoke } as never;
});

const SCHEDULED_AT = new Date("2026-02-04T10:00:00");
const UPDATED_AT = new Date("2026-01-01T00:00:00");

const mockSession: SessionWithClientAndTherapist = {
  id: sessionId(1),
  client_id: clientId(1),
  therapist_id: therapistId(1),
  scheduled_at: SCHEDULED_AT,
  occurred_at: null,
  duration: 60,
  status: null as SessionStatus | null,
  session_type: "Child",
  delivery_method: "FaceToFace",
  missed_reason: null as MissedReason | null,
  notes: null,
  updated_at: UPDATED_AT,
  client: {
    id: clientId(1),
    hospital_number: "HN001",
    first_name: "Jane",
    last_name: "Smith",
    dob: new Date("2000-01-15"),
    start_date: new Date("2025-09-01"),
    therapist_id: therapistId(1),
    address: null,
    phone: "07700900001",
    email: null,
    session_day: null,
    session_time: null,
    session_duration: null,
    session_delivery_method: null,
    closed_date: null,
    pre_score: null,
    post_score: null,
    outcome: null,
    notes: null,
    updated_at: UPDATED_AT,
  },
  therapist: {
    id: therapistId(1),
    first_name: "Alice",
    last_name: "Morgan",
    is_admin: true,
    start_date: new Date("2024-01-01"),
    deactivated_date: null,
    updated_at: UPDATED_AT,
  },
};

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useConfirmSession — set status", () => {
  it("pre-fills occurred from session.scheduled_at when status changes to Attended with empty occurred fields", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.set("status", "Attended");
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("2026-02-04");
      expect(result.current.form.occurred_time).toBe("10:00");
    });
  });

  it("does not overwrite occurred fields when they are already set before Attended is picked", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    // Pre-set occurred fields manually.
    act(() => {
      result.current.set("occurred_date", "2026-02-05");
      result.current.set("occurred_time", "11:00");
    });

    act(() => {
      result.current.set("status", "Attended");
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("2026-02-05");
      expect(result.current.form.occurred_time).toBe("11:00");
    });
  });

  it("clears occurred fields when status changes to DNA", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.set("occurred_date", "2026-02-04");
      result.current.set("occurred_time", "10:00");
      result.current.set("status", "DNA");
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("");
      expect(result.current.form.occurred_time).toBe("");
    });
  });

  it("clears occurred fields when status changes to Cancelled", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.set("occurred_date", "2026-02-04");
      result.current.set("occurred_time", "10:00");
      result.current.set("status", "Cancelled");
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("");
      expect(result.current.form.occurred_time).toBe("");
    });
  });

  it("clears missed_reason when status changes to Attended", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.set("missed_reason", "Illness");
      result.current.set("status", "Attended");
    });

    await waitFor(() => {
      expect(result.current.form.missed_reason).toBe("");
    });
  });
});

describe("useConfirmSession — openConfirmDialog", () => {
  it("resets form to EMPTY status and pre-fills occurred from session.scheduled_at", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.set("status", "DNA");
      result.current.set("missed_reason", "Illness");
    });

    act(() => {
      result.current.openConfirmDialog();
    });

    await waitFor(() => {
      expect(result.current.form.status).toBe("");
      expect(result.current.form.missed_reason).toBe("");
      expect(result.current.form.occurred_date).toBe("2026-02-04");
      expect(result.current.form.occurred_time).toBe("10:00");
    });
  });

  it("sets showConfirmDialog to true", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.openConfirmDialog();
    });

    await waitFor(() => {
      expect(result.current.showConfirmDialog).toBe(true);
    });
  });
});

describe("useConfirmSession — dismissConfirmDialog", () => {
  it("sets showConfirmDialog to false", async () => {
    const { result } = renderHook(() => useConfirmSession(mockSession), { wrapper });

    act(() => {
      result.current.openConfirmDialog();
    });

    await waitFor(() => expect(result.current.showConfirmDialog).toBe(true));

    act(() => {
      result.current.dismissConfirmDialog();
    });

    await waitFor(() => {
      expect(result.current.showConfirmDialog).toBe(false);
    });
  });
});
