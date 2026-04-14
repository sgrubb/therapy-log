import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import { SessionProvider, useSessions } from "@/context/SessionsContext";
import { wrapped, wrappedPaginated, mockTherapists, mockSessions, mockClients } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";
import { format, startOfWeek, endOfWeek } from "date-fns";

const mockInvoke = vi.fn();

function defaultMock() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list-all") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "session:list") return Promise.resolve(wrappedPaginated(mockSessions));
    if (channel === "session:list-range") return Promise.resolve(wrapped([]));
    if (channel === "session:list-expected") return Promise.resolve(wrapped([]));
    if (channel === "client:list-all") return Promise.resolve(wrapped(mockClients));
    return Promise.resolve(wrapped([]));
  });
}

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  defaultMock();
});

const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

function renderSessionsHook() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <SessionProvider>
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
  it("returns sessions from IPC on initial load", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => {
      expect(result.current.displayedSessions).toHaveLength(2);
    });
  });

  it("defaults date preset to 'this week'", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    expect(result.current.datePreset).toBe("this_week");
    expect(result.current.dateFromFilter).toBe(weekStart);
    expect(result.current.dateToFilter).toBe(weekEnd);
  });

  it("updating clientFilter changes state and resets page", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    await act(async () => { result.current.setPage(3); });
    await act(async () => { result.current.setClientFilter("1"); });

    await waitFor(() => {
      expect(result.current.clientFilter).toBe("1");
      expect(result.current.page).toBe(1);
    });
  });

  it("updating therapistFilter changes state and resets page", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    await act(async () => { result.current.setPage(2); });
    await act(async () => { result.current.setTherapistFilter("2"); });

    await waitFor(() => {
      expect(result.current.therapistFilter).toBe("2");
      expect(result.current.page).toBe(1);
    });
  });

  it("updating statusFilter changes state and resets page", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    await act(async () => { result.current.setPage(2); });
    await act(async () => { result.current.setStatusFilter("DNA"); });

    await waitFor(() => {
      expect(result.current.statusFilter).toBe("DNA");
      expect(result.current.page).toBe(1);
    });
  });

  it("switches to custom preset when dates are manually changed", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    await act(async () => { result.current.setDateFromFilter("2026-01-01"); });

    await waitFor(() => {
      expect(result.current.datePreset).toBe("custom");
    });
  });

  it("resets all filters to defaults", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    act(() => {
      result.current.setClientFilter("1");
      result.current.setTherapistFilter("2");
      result.current.setStatusFilter("DNA");
      result.current.setDateFromFilter("2026-01-01");
      result.current.setPage(3);
    });

    act(() => { result.current.reset(); });

    expect(result.current.clientFilter).toBe("all");
    expect(result.current.statusFilter).toBe("all");
    expect(result.current.datePreset).toBe("this_week");
    expect(result.current.page).toBe(1);
    expect(result.current.overdueOnly).toBe(false);
    expect(result.current.unconfirmedOnly).toBe(false);
    expect(result.current.overlappingOnly).toBe(false);
    expect(result.current.expectedOpen).toBe(false);
  });

  it("checkbox handlers are mutually exclusive", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    act(() => { result.current.handleOverdueOnly(true); });
    expect(result.current.overdueOnly).toBe(true);
    expect(result.current.expectedOpen).toBe(true);

    act(() => { result.current.handleUnconfirmedOnly(true); });
    expect(result.current.unconfirmedOnly).toBe(true);
    expect(result.current.overdueOnly).toBe(false);

    act(() => { result.current.handleOverlappingOnly(true); });
    expect(result.current.overlappingOnly).toBe(true);
    expect(result.current.unconfirmedOnly).toBe(false);
  });

  it("shows unconfirmed sessions computed from range sessions", async () => {
    const past = new Date("2020-01-01T10:00:00");
    const unconfirmedSession = { ...mockSessions[0]!, id: 10, status: "Scheduled" as const, scheduled_at: past };
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return Promise.resolve(wrappedPaginated(mockSessions));
      if (channel === "session:list-range") return Promise.resolve(wrapped([unconfirmedSession]));
      if (channel === "session:list-expected") return Promise.resolve(wrapped([]));
      if (channel === "client:list-all") return Promise.resolve(wrapped(mockClients));
      return Promise.resolve(wrapped([]));
    });

    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions).toHaveLength(2));

    act(() => { result.current.handleUnconfirmedOnly(true); });

    await waitFor(() => {
      expect(result.current.displayedSessions).toHaveLength(1);
      expect(result.current.displayedSessions[0]!.id).toBe(10);
    });
  });

  it("shows overlapping sessions computed from range sessions", async () => {
    // Two sessions for the same therapist at overlapping times
    const sessionA = {
      ...mockSessions[0]!,
      id: 20,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:00:00"),
      duration: 60,
    };
    const sessionB = {
      ...mockSessions[0]!,
      id: 21,
      therapist_id: 1,
      scheduled_at: new Date("2026-06-01T10:30:00"),
      duration: 60,
    };
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return Promise.resolve(wrappedPaginated([sessionA, sessionB]));
      if (channel === "session:list-range") return Promise.resolve(wrapped([sessionA, sessionB]));
      if (channel === "session:list-expected") return Promise.resolve(wrapped([]));
      if (channel === "client:list-all") return Promise.resolve(wrapped(mockClients));
      return Promise.resolve(wrapped([]));
    });

    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    act(() => { result.current.handleOverlappingOnly(true); });

    await waitFor(() => {
      expect(result.current.displayedSessions).toHaveLength(2);
    });
  });

  it("exposes totalSessions and pageSize from paginated response", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") {
        return Promise.resolve(wrapped({ data: mockSessions, total: 100, page: 1, pageSize: 25 }));
      }
      if (channel === "session:list-range") return Promise.resolve(wrapped([]));
      if (channel === "session:list-expected") return Promise.resolve(wrapped([]));
      if (channel === "client:list-all") return Promise.resolve(wrapped(mockClients));
      return Promise.resolve(wrapped([]));
    });

    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    expect(result.current.totalSessions).toBe(100);
    expect(result.current.pageSize).toBe(25);
  });

it("defaults therapist filter to selected therapist", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    expect(result.current.therapistFilter).toBe("1");
    expect(result.current.showMine).toBe(true);
  });

  it("hides expected section when date range is unbounded", async () => {
    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.displayedSessions.length).toBeGreaterThan(0));

    act(() => { result.current.setDatePreset("all_time" as const); });

    expect(result.current.showExpectedSection).toBe(false);
  });

  it("shows expected section when date range is bounded and expected sessions exist", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return Promise.resolve(wrappedPaginated(mockSessions));
      if (channel === "session:list-range") return Promise.resolve(wrapped([]));
      if (channel === "session:list-expected") {
        return Promise.resolve(wrapped([{
          id: "exp-1",
          client_id: 3,
          therapist_id: 1,
          scheduled_at: new Date(),
          duration: 60,
          client: { id: 3, first_name: "Eve", last_name: "Walker" },
          therapist: { id: 1, first_name: "Alice", last_name: "Morgan" },
        }]));
      }
      if (channel === "client:list-all") return Promise.resolve(wrapped(mockClients));
      return Promise.resolve(wrapped([]));
    });

    const { result } = renderSessionsHook();
    await waitFor(() => expect(result.current.showExpectedSection).toBe(true));
  });
});

describe("useSessions", () => {
  it("throws when used outside SessionProvider", () => {
    expect(() => {
      renderHook(() => useSessions());
    }).toThrow("useSessions must be used within a SessionProvider");
  });
});
