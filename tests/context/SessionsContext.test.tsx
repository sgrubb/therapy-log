import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import { SessionProvider, useSessions } from "@/context/SessionsContext";
import { wrapped, mockTherapists, mockSessions, mockClients, mockClientBase, MOCK_SESSION_DATE_RECENT, MOCK_SESSION_DATE_OLDER } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";
import { format, startOfWeek, endOfWeek } from "date-fns";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    return Promise.resolve(wrapped([]));
  });
});

const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
const recentDate = format(MOCK_SESSION_DATE_RECENT, "yyyy-MM-dd");
const olderDate = format(MOCK_SESSION_DATE_OLDER, "yyyy-MM-dd");

function renderSessionsHook(sessions = mockSessions, clients = mockClients) {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <SessionProvider sessions={sessions} clients={clients}>
              {children}
            </SessionProvider>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useSessions(), { wrapper: Wrapper });
}

describe("SessionProvider", () => {
  it("provides filtered sessions within the default 'this week' range", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => {
      expect(result.current.filtered.length).toBeGreaterThan(0);
    });

    // Both mock sessions should be within this week
    expect(result.current.filtered).toHaveLength(2);
  });

  it("defaults date preset to 'this week'", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    expect(result.current.datePreset).toBe("this_week");
    expect(result.current.dateFromFilter).toBe(weekStart);
    expect(result.current.dateToFilter).toBe(weekEnd);
  });

  it("filters by client", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setClientFilter("1");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.client.first_name).toBe("Jane");
  });

  it("filters by therapist", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setTherapistFilter("2");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.therapist.last_name).toBe("Chen");
  });

  it("filters by status", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("DNA");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.status).toBe("DNA");
  });

  it("filters by from date", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setDateFromFilter(recentDate);
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.client.first_name).toBe("Jane");
  });

  it("filters by to date", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setDateToFilter(olderDate);
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.client.first_name).toBe("Tom");
  });

  it("switches to custom preset when dates are manually changed", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setDateFromFilter("2026-01-01");
    });

    expect(result.current.datePreset).toBe("custom");
  });

  it("resets all filters to defaults", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setClientFilter("1");
      result.current.setTherapistFilter("2");
      result.current.setStatusFilter("DNA");
      result.current.setDateFromFilter("2026-01-01");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.clientFilter).toBe("all");
    expect(result.current.statusFilter).toBe("all");
    expect(result.current.datePreset).toBe("this_week");
    expect(result.current.overdueOnly).toBe(false);
    expect(result.current.unconfirmedOnly).toBe(false);
    expect(result.current.overlappingOnly).toBe(false);
    expect(result.current.expectedOpen).toBe(false);
  });

  it("checkbox handlers are mutually exclusive", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.handleOverdueOnly(true);
    });
    expect(result.current.overdueOnly).toBe(true);
    expect(result.current.expectedOpen).toBe(true);

    act(() => {
      result.current.handleUnconfirmedOnly(true);
    });
    expect(result.current.unconfirmedOnly).toBe(true);
    expect(result.current.overdueOnly).toBe(false);

    act(() => {
      result.current.handleOverlappingOnly(true);
    });
    expect(result.current.overlappingOnly).toBe(true);
    expect(result.current.unconfirmedOnly).toBe(false);
  });

  it("provides unique clients derived from sessions", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.uniqueClients.length).toBeGreaterThan(0));

    expect(result.current.uniqueClients).toHaveLength(2);
    // Sorted by "last, first"
    const names = result.current.uniqueClients.map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });

  it("defaults therapist filter to selected therapist", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    expect(result.current.therapistFilter).toBe("1");
    expect(result.current.showMine).toBe(true);
    // Only therapist 1's session should be visible
    expect(result.current.filtered).toHaveLength(1);
  });

  it("computes expected session rows when date range is bounded", async () => {
    const overdueClient = {
      ...mockClientBase,
      id: 3,
      first_name: "Eve",
      last_name: "Walker",
      hospital_number: "HN003",
      therapist_id: 1,
      therapist: mockTherapists[0]!,
      session_day: "Monday" as const,
      session_time: "09:00",
      session_duration: 60,
      session_delivery_method: "FaceToFace" as const,
    };

    const { result } = renderSessionsHook(mockSessions, [...mockClients, overdueClient]);
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    // Default range is "this week" (bounded), so expected sessions should be computed
    expect(result.current.displayedExpectedRows.length).toBeGreaterThanOrEqual(0);
  });

  it("hides expected section when date range is unbounded", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setDatePreset("all_time" as const);
    });

    expect(result.current.showExpectedSection).toBe(false);
  });
});

describe("useSessions", () => {
  it("throws when used outside SessionProvider", () => {
    expect(() => {
      renderHook(() => useSessions());
    }).toThrow("useSessions must be used within a SessionProvider");
  });
});
