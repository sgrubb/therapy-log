import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import TherapistDetailPage from "@/pages/TherapistDetailPage";
import {
  wrapped,
  mockTherapists,
  mockTherapist,
  mockClients,
  errorResponse,
} from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");
vi.mock("@/components/ui/searchable-select");

function ClientDetailSpy() {
  const location = useLocation();
  return (
    <div
      data-testid="client-detail"
      data-from={(location.state as { from?: string } | null)?.from ?? ""}
    />
  );
}

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

interface RenderOptions {
  therapistOverride?: Partial<typeof mockTherapist>;
  asAdmin?: boolean;
  selectedTherapistId?: number | null;
}

function renderDetail(options: RenderOptions = {}) {
  const { therapistOverride, asAdmin = true, selectedTherapistId = null } = options;
  const therapistData = { ...mockTherapist, ...therapistOverride };

  // The "selected therapist" decides whether the viewer is admin.
  const therapistsForContext = asAdmin
    ? mockTherapists
    : mockTherapists.map((t) => ({ ...t, is_admin: false }));

  const idToSelect = selectedTherapistId ?? therapistsForContext[0]!.id;
  localStorage.setItem("selectedTherapistId", String(idToSelect));

  mockInvoke.mockImplementation((channel: string, params: unknown) => {
    if (channel === "therapist:list-all") {
      return Promise.resolve(wrapped(therapistsForContext));
    }
    if (channel === "therapist:get") {
      return Promise.resolve(wrapped(therapistData));
    }
    if (channel === "client:list-all") {
      const { therapistId } = (params ?? {}) as { therapistId?: number };
      const clients = therapistId
        ? mockClients.filter((c) => c.therapist_id === therapistId && c.closed_date === null)
        : mockClients;
      return Promise.resolve(wrapped(clients));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={[`/therapists/${therapistData.id}`]}>
              <Routes>
                <Route path="/therapists">
                  <Route path=":id" element={<TherapistDetailPage />} />
                  <Route path=":id/edit" element={<div data-testid="therapist-edit" />} />
                  <Route index element={<div data-testid="therapists-list" />} />
                </Route>
                <Route path="/clients/:id" element={<ClientDetailSpy />} />
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

describe("TherapistDetailPage", () => {
  it("renders therapist name and active badge", async () => {
    renderDetail();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Alice Morgan/ }),
      ).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  it("renders inactive badge and shows reactivate button for deactivated therapists", async () => {
    renderDetail({
      therapistOverride: { deactivated_date: new Date("2026-01-01T00:00:00.000Z") },
    });
    await waitFor(() => {
      expect(screen.getByText("Inactive")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^reactivate$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^deactivate$/i })).not.toBeInTheDocument();
    });
  });

  it("shows deactivate button for active therapists", async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^deactivate$/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^reactivate$/i })).not.toBeInTheDocument();
    });
  });

  it("shows the therapist's start date", async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText("Start Date")).toBeInTheDocument();
    });
  });

  it("shows deactivated date when therapist is deactivated", async () => {
    renderDetail({
      therapistOverride: { deactivated_date: new Date("2026-01-01T00:00:00.000Z") },
    });
    await waitFor(() => {
      expect(screen.getByText("Deactivated Date")).toBeInTheDocument();
    });
  });

  it("does not render deactivated date for active therapists", async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
    expect(screen.queryByText("Deactivated Date")).not.toBeInTheDocument();
  });

  it("renders the active clients table", async () => {
    renderDetail();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Active Clients/ })).toBeInTheDocument();
      // Alice (id=1) has Jane Smith and Eve Walker as active clients in the mock.
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Eve Walker")).toBeInTheDocument();
    });
  });

  it("does not render closed clients in the active clients table", async () => {
    renderDetail();
    await waitFor(() => screen.getByText("Jane Smith"));
    // Tom Jones is closed (closed_date is set in mockClients).
    expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
  });

  it("clicking a client row navigates to the client detail page with back state", async () => {
    renderDetail();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.click(screen.getByText("Jane Smith"));

    await waitFor(() => {
      const detail = screen.getByTestId("client-detail");
      expect(detail).toBeInTheDocument();
      expect(detail).toHaveAttribute("data-from", "/therapists/1");
    });
  });

  it("shows admin: yes for admin therapists", async () => {
    renderDetail();
    await waitFor(() => screen.getByText("Yes"));
  });

  it("shows admin: no for non-admin therapists", async () => {
    renderDetail({
      therapistOverride: { ...mockTherapists[1]! }, // Bob, is_admin: false
    });
    await waitFor(() => screen.getByText("No"));
  });

  it("renders nothing for non-admin viewers", async () => {
    const { container } = renderDetail({ asAdmin: false });
    // Wait a tick for queries to resolve, then assert the page rendered nothing.
    await waitFor(() => {
      // therapist:list-all is mocked, so the SelectedTherapist context resolves.
      expect(mockInvoke).toHaveBeenCalledWith("therapist:list-all", expect.any(Object));
    });
    expect(container.querySelector("h1")).toBeNull();
  });

  it("shows error boundary when therapist is not found", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return Promise.resolve(errorResponse.notFound);
      }
      return Promise.resolve(wrapped(null));
    });
    localStorage.setItem("selectedTherapistId", "1");

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/therapists/999"]}>
                <Routes>
                  <Route path="/therapists/:id" element={<TherapistDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    spy.mockRestore();
  });
});
