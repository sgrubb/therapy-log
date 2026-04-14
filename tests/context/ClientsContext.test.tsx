import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import { ClientProvider, useClients } from "@/context/ClientsContext";
import { wrapped, wrappedPaginated, mockTherapists, mockClients } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

// Simulate the backend filter logic so context tests verify the right data flows through.
function clientListMock(params: unknown) {
  const { status, therapistId, search } = (params ?? {}) as {
    status?: string;
    therapistId?: number | null;
    search?: string;
  };
  let clients = [...mockClients];
  if (status === "open") { clients = clients.filter((c) => c.closed_date === null); }
  if (status === "closed") { clients = clients.filter((c) => c.closed_date !== null); }
  if (therapistId != null) { clients = clients.filter((c) => c.therapist_id === therapistId); }
  if (search) {
    const q = search.toLowerCase();
    clients = clients.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
        c.hospital_number.toLowerCase().includes(q),
    );
  }
  return Promise.resolve(wrappedPaginated(clients));
}

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string, params: unknown) => {
    if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
    if (channel === "client:list") { return clientListMock(params); }
    return Promise.resolve(wrapped([]));
  });
});

function renderClientsHook() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <ClientProvider>{children}</ClientProvider>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useClients(), { wrapper: Wrapper });
}

describe("ClientProvider", () => {
  it("provides open clients by default", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => {
      // Jane and Eve are open, Tom is closed — default status filter is "open"
      expect(result.current.clients).toHaveLength(2);
      expect(result.current.clients.map((c) => c.first_name)).toContain("Jane");
    });
  });

  it("filters by status: closed", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => { result.current.setStatusFilter("closed"); });

    await waitFor(() => {
      expect(result.current.clients).toHaveLength(1);
      expect(result.current.clients[0]!.first_name).toBe("Tom");
    });
  });

  it("filters by status: all", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => { result.current.setStatusFilter("all"); });

    await waitFor(() => {
      expect(result.current.clients).toHaveLength(3);
    });
  });

  it("filters by therapist", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setTherapistFilter("2");
    });

    await waitFor(() => {
      expect(result.current.clients).toHaveLength(1);
      expect(result.current.clients[0]!.first_name).toBe("Tom");
    });
  });

  it("filters by search (name)", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("jane");
    });

    await waitFor(() => {
      expect(result.current.clients).toHaveLength(1);
      expect(result.current.clients[0]!.first_name).toBe("Jane");
    });
  });

  it("filters by search (hospital number)", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("HN002");
    });

    await waitFor(() => {
      expect(result.current.clients).toHaveLength(1);
      expect(result.current.clients[0]!.first_name).toBe("Tom");
    });
  });

  it("resets all filters to defaults", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => {
      result.current.setStatusFilter("all");
      result.current.setSearch("jane");
      result.current.setTherapistFilter("1");
    });

    act(() => { result.current.reset(); });

    expect(result.current.search).toBe("");
    expect(result.current.statusFilter).toBe("open");
    expect(result.current.therapistFilter).toBe("all");
  });

  it("defaults therapist filter to selected therapist when one is set", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    expect(result.current.therapistFilter).toBe("1");
    expect(result.current.showMine).toBe(true);
  });

  it("showMine is false when therapist filter differs from selected therapist", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    act(() => { result.current.setTherapistFilter("all"); });

    await waitFor(() => expect(result.current.showMine).toBe(false));
  });

  it("exposes totalClients and pageSize from the paginated response", async () => {
    const { result } = renderClientsHook();
    await waitFor(() => expect(result.current.clients.length).toBeGreaterThan(0));

    expect(result.current.totalClients).toBe(2); // two open clients
    expect(result.current.pageSize).toBeGreaterThan(0);
  });
});

describe("useClients", () => {
  it("throws when used outside ClientProvider", () => {
    expect(() => {
      renderHook(() => useClients());
    }).toThrow("useClients must be used within a ClientProvider");
  });
});
