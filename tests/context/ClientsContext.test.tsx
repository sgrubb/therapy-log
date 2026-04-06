import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import { ClientProvider, useClients } from "@/context/ClientsContext";
import { wrapped, mockTherapists, mockClients } from "../helpers/ipc-mocks";
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
    return Promise.resolve(wrapped([]));
  });
});

function renderClientsHook(clients = mockClients) {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <ClientProvider clients={clients}>{children}</ClientProvider>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useClients(), { wrapper: Wrapper });
}

describe("ClientProvider", () => {
  it("provides filtered clients (open by default)", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => {
      // Jane is open, Tom is closed — default status filter is "open"
      expect(result.current.filtered).toHaveLength(1);
      expect(result.current.filtered[0]!.first_name).toBe("Jane");
    });
  });

  it("filters by status: closed", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("closed");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.first_name).toBe("Tom");
  });

  it("filters by status: all", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
    });

    expect(result.current.filtered).toHaveLength(2);
  });

  it("filters by therapist", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setTherapistFilter("2");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.first_name).toBe("Tom");
  });

  it("filters by search (name)", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("jane");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.first_name).toBe("Jane");
  });

  it("filters by search (hospital number)", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("HN002");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]!.first_name).toBe("Tom");
  });

  it("resets all filters to defaults", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("jane");
      result.current.setTherapistFilter("1");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.search).toBe("");
    expect(result.current.statusFilter).toBe("open");
    expect(result.current.therapistFilter).toBe("all");
  });

  it("provides sorted therapists for the filter dropdown", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.sortedTherapists.length).toBeGreaterThan(0));

    const names = result.current.sortedTherapists.map((t) => t.last_name);
    expect(names).toEqual([...names].sort());
  });

  it("defaults therapist filter to selected therapist when one is set", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    expect(result.current.therapistFilter).toBe("1");
    expect(result.current.showMine).toBe(true);
  });

  it("showMine is false when therapist filter differs from selected therapist", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.filtered.length).toBeGreaterThan(0));

    act(() => {
      result.current.setTherapistFilter("all");
    });

    expect(result.current.showMine).toBe(false);
  });
});

describe("useClients", () => {
  it("throws when used outside ClientProvider", () => {
    expect(() => {
      renderHook(() => useClients());
    }).toThrow("useClients must be used within a ClientProvider");
  });
});
