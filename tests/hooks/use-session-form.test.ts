import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Suspense, createElement } from "react";
import { useSessionForm } from "@/hooks/use-session-form";
import { createTestQueryClient } from "../helpers/query-client";
import { SessionStatus } from "@shared/types/enums";

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
    createElement(
      MemoryRouter,
      null,
      createElement(Suspense, { fallback: null }, children),
    ),
  );
}

async function renderSettledHook(defaults?: Parameters<typeof useSessionForm>[1]) {
  const hook = renderHook(() => useSessionForm(undefined, defaults), { wrapper });
  await waitFor(() => {
    expect(hook.result.current.form).toBeDefined();
  });
  return hook;
}

// ── set("status") — occurred auto-fill and clear ──────────────────────────

describe("useSessionForm — set status to Attended", () => {
  it("pre-fills occurred_date/time from scheduled date/time when occurred fields are empty", async () => {
    const { result } = await renderSettledHook();

    // Set a past date/time so status fields are relevant.
    act(() => {
      result.current.set("date", "2020-06-15");
      result.current.set("time", "10:00");
    });

    act(() => {
      result.current.set("status", SessionStatus.Attended);
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("2020-06-15");
      expect(result.current.form.occurred_time).toBe("10:00");
    });
  });

  it("does not overwrite occurred fields already set when status changes to Attended", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("date", "2020-06-15");
      result.current.set("time", "10:00");
      result.current.set("occurred_date", "2020-06-16");
      result.current.set("occurred_time", "11:30");
    });

    act(() => {
      result.current.set("status", SessionStatus.Attended);
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("2020-06-16");
      expect(result.current.form.occurred_time).toBe("11:30");
    });
  });

  it("clears missed_reason when status changes to Attended", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("missed_reason", "Illness");
    });

    act(() => {
      result.current.set("status", SessionStatus.Attended);
    });

    await waitFor(() => {
      expect(result.current.form.missed_reason).toBe("");
    });
  });
});

describe("useSessionForm — set status to non-Attended", () => {
  it("clears occurred_date and occurred_time when status changes to DNA", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("occurred_date", "2020-06-15");
      result.current.set("occurred_time", "10:00");
    });

    act(() => {
      result.current.set("status", SessionStatus.DNA);
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("");
      expect(result.current.form.occurred_time).toBe("");
    });
  });

  it("clears occurred_date and occurred_time when status changes to Cancelled", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("occurred_date", "2020-06-15");
      result.current.set("occurred_time", "10:00");
    });

    act(() => {
      result.current.set("status", SessionStatus.Cancelled);
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("");
      expect(result.current.form.occurred_time).toBe("");
    });
  });

  it("clears occurred_date and occurred_time when status is cleared", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("occurred_date", "2020-06-15");
      result.current.set("occurred_time", "10:00");
    });

    act(() => {
      result.current.set("status", "" as SessionStatus);
    });

    await waitFor(() => {
      expect(result.current.form.occurred_date).toBe("");
      expect(result.current.form.occurred_time).toBe("");
    });
  });

  it("clears missed_reason when status is cleared", async () => {
    const { result } = await renderSettledHook();

    act(() => {
      result.current.set("missed_reason", "Holiday");
    });

    act(() => {
      result.current.set("status", "" as SessionStatus);
    });

    await waitFor(() => {
      expect(result.current.form.missed_reason).toBe("");
    });
  });
});

// ── defaults pre-population ───────────────────────────────────────────────

describe("useSessionForm — defaults", () => {
  it("pre-populates date/time from defaults", async () => {
    const { result } = await renderSettledHook({
      date: "2026-03-01",
      time: "14:00",
    });

    await waitFor(() => {
      expect(result.current.form.date).toBe("2026-03-01");
      expect(result.current.form.time).toBe("14:00");
    });
  });

  it("pre-populates clientId from defaults", async () => {
    const { result } = await renderSettledHook({ clientId: "5" });

    await waitFor(() => {
      expect(result.current.form.client_id).toBe("5");
    });
  });
});
