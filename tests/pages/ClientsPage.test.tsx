import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import ClientsPage from "@/pages/ClientsPage";
import { wrapped, wrappedPaginated, mockTherapists, mockClients } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");

const mockInvoke = vi.fn();

const openClients = mockClients.filter((c) => c.closed_date === null);

function defaultMock() {
  mockInvoke.mockImplementation((channel: string, params: unknown) => {
    if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
    if (channel === "client:list") {
      const { status } = (params ?? {}) as { status?: string };
      const data = status === "all" ? mockClients : status === "closed"
        ? mockClients.filter((c) => c.closed_date !== null)
        : openClients;
      return Promise.resolve(wrappedPaginated(data));
    }
    return Promise.resolve(wrapped([]));
  });
}

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  defaultMock();
});

function renderClientsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/clients"]}>
              <Routes>
                <Route path="/clients">
                  <Route index element={<ClientsPage />} />
                  <Route path="new" element={<div data-testid="client-form" />} />
                  <Route path=":id" element={<div data-testid="client-detail" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

describe("ClientsPage", () => {
  it("renders open clients by default", async () => {
    renderClientsPage();
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
    // Tom Jones is closed — default status filter sends status:"open" to backend
    expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
  });

  it("shows hospital number and therapist name in each row", async () => {
    renderClientsPage();
    await waitFor(() => {
      expect(screen.getByText("HN001")).toBeInTheDocument();
      expect(screen.getAllByText("Alice Morgan").length).toBeGreaterThan(0);
    });
  });

  it("navigates to client detail on row click", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.click(screen.getByText("Jane Smith").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByTestId("client-detail")).toBeInTheDocument();
    });
  });

  it("navigates to /clients/new when Add Client is clicked", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByRole("link", { name: /add client/i }));

    fireEvent.click(screen.getByRole("link", { name: /add client/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-form")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching clients", async () => {
    type WrappedClients = ReturnType<typeof wrappedPaginated<(typeof mockClients)[0]>>;
    let resolveClients!: (v: WrappedClients) => void;
    const clientsPromise = new Promise<WrappedClients>((res) => {
      resolveClients = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
      if (channel === "client:list") { return clientsPromise; }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClients(wrappedPaginated(openClients));
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("renders without crashing when client:list fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
      if (channel === "client:list") { return Promise.reject(new Error("DB error")); }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("shows empty state when no clients match filters", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
      if (channel === "client:list") { return Promise.resolve(wrappedPaginated([])); }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });
  });
});
