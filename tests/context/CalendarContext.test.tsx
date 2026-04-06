import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { addDays, set } from "date-fns";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import { CalendarProvider, useCalendar } from "@/context/CalendarContext";
import { wrapped, mockTherapists, mockSessions, mockClients, mockClientBase } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "session:list") {
      return Promise.resolve(wrapped(mockSessions));
    }
    if (channel === "client:list") {
      return Promise.resolve(wrapped(mockClients));
    }
    return Promise.resolve(wrapped([]));
  });
});

function renderCalendarHook() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <CalendarProvider>{children}</CalendarProvider>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useCalendar(), { wrapper: Wrapper });
}

describe("CalendarProvider", () => {
  it("defaults to week view", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    expect(result.current.view).toBe("week");
  });

  it("provides therapist options from context", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    expect(result.current.therapistOptions).toHaveLength(2);
    expect(result.current.therapistOptions[0]!.label).toContain("Alice");
  });

  it("shows no events when no therapist is selected", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    expect(result.current.events).toHaveLength(0);
  });

  it("pre-selects therapist from context and shows their events", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));

    expect(result.current.selectedTherapistIds).toContain("1");
  });

  it("updates view state", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    act(() => {
      result.current.setView("month");
    });

    expect(result.current.view).toBe("month");
  });

  it("updates current date", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    const newDate = new Date(2026, 5, 15);
    act(() => {
      result.current.setCurrentDate(newDate);
    });

    expect(result.current.currentDate).toBe(newDate);
  });

  it("defaults showPlaceholders to true", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    expect(result.current.showPlaceholders).toBe(true);
  });

  it("checkbox handlers are mutually exclusive", async () => {
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.therapistOptions.length).toBeGreaterThan(0));

    act(() => {
      result.current.handleOverdueOnly(true);
    });
    expect(result.current.overdueOnly).toBe(true);
    expect(result.current.showPlaceholders).toBe(true);
    expect(result.current.showOverlappingOnly).toBe(false);

    act(() => {
      result.current.handleUnconfirmedOnly(true);
    });
    expect(result.current.unconfirmedOnly).toBe(true);
    expect(result.current.overdueOnly).toBe(false);

    act(() => {
      result.current.handleOverlappingOnly(true);
    });
    expect(result.current.showOverlappingOnly).toBe(true);
    expect(result.current.unconfirmedOnly).toBe(false);
  });

  it("reset restores defaults", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));

    act(() => {
      result.current.setTherapistIds(["1", "2"]);
      result.current.setShowPlaceholders(false);
      result.current.handleOverlappingOnly(true);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.selectedTherapistIds).toEqual(["1"]);
    expect(result.current.showPlaceholders).toBe(true);
    expect(result.current.showOverlappingOnly).toBe(false);
    expect(result.current.overdueOnly).toBe(false);
    expect(result.current.unconfirmedOnly).toBe(false);
  });

  it("computes overlapping count for same-therapist concurrent sessions", async () => {
    const tomorrow10am = set(addDays(new Date(), 1), { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });

    const overlappingSessions = [
      { ...mockSessions[0]!, scheduled_at: tomorrow10am },
      {
        ...mockSessions[0]!,
        id: 99,
        scheduled_at: tomorrow10am,
        client_id: 2,
        client: {
          ...mockClientBase,
          id: 2,
          first_name: "Tom",
          last_name: "Jones",
          therapist_id: 1,
          hospital_number: "HN002",
        },
      },
    ];

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.resolve(wrapped(overlappingSessions));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      return Promise.resolve(wrapped([]));
    });

    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));

    expect(result.current.overlappingCount).toBe(2);
  });

  it("provides eventPropGetter that returns style with color", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderCalendarHook();
    await waitFor(() => expect(result.current.events.length).toBeGreaterThan(0));

    const event = result.current.events[0]!;
    const props = result.current.eventPropGetter(event);
    expect(props.style.backgroundColor).toBeDefined();
    expect(props.style.border).toBe("none");
  });
});

describe("useCalendar", () => {
  it("throws when used outside CalendarProvider", () => {
    expect(() => {
      renderHook(() => useCalendar());
    }).toThrow("useCalendar must be used within a CalendarProvider");
  });
});
