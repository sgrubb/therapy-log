import { format } from "date-fns";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import SessionDetailPage from "@/pages/SessionDetailPage";
import { wrapped, mockTherapists, mockSession, errorResponse } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

function EditFormSpy() {
  const location = useLocation();
  return (
    <div
      data-testid="session-edit-form"
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

function renderDetailPage(sessionOverride?: Partial<typeof mockSession> | null) {
  const sessionData =
    sessionOverride === null
      ? null
      : { ...mockSession, ...sessionOverride };

  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "session:get") {
      return Promise.resolve(sessionData === null ? errorResponse.notFound : wrapped(sessionData));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/sessions/1"]}>
              <Routes>
                <Route path="/sessions">
                  <Route path=":id" element={<SessionDetailPage />} />
                  <Route path=":id/edit" element={<EditFormSpy />} />
                  <Route index element={<div data-testid="sessions-list" />} />
                </Route>
                <Route path="/clients/:id" element={<div data-testid="client-detail" />} />
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

describe("SessionDetailPage", () => {
  it("renders client and therapist names", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Jane Smith/ })).toBeInTheDocument();
      expect(screen.getByText("Alice Morgan")).toBeInTheDocument();
    });
  });

  it("renders session type and delivery method display names", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Face to Face")).toBeInTheDocument();
    });
  });

  it("renders status", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Attended")).toBeInTheDocument();
    });
  });

  it("renders date and time", async () => {
    renderDetailPage();
    const date = format(mockSession.scheduled_at, "dd/MM/yyyy");
    await waitFor(() => {
      expect(screen.getByText(date)).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching", async () => {
    let resolveSession!: (v: typeof mockSession) => void;
    const sessionPromise = new Promise<typeof mockSession>((res) => {
      resolveSession = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:get") {
        return sessionPromise.then((d) => wrapped(d));
      }
      return Promise.resolve(wrapped(null));
    });

    renderDetailPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSession(mockSession);
    await waitFor(() => screen.getByRole("heading", { name: /Jane Smith/ }));
  });

  it("shows not-found state when session does not exist", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderDetailPage(null);
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("navigates to edit form when Edit is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("link", { name: /edit/i }));

    fireEvent.click(screen.getByRole("link", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-edit-form")).toBeInTheDocument();
    });
  });

  it("Edit link passes location state so cancel returns to detail page", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("link", { name: /edit/i }));

    fireEvent.click(screen.getByRole("link", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-edit-form")).toHaveAttribute(
        "data-from",
        "/sessions/1",
      );
    });
  });

  it("navigates to sessions list when Back is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("link", { name: /back to sessions/i }));

    fireEvent.click(screen.getByRole("link", { name: /back to sessions/i }));

    await waitFor(() => {
      expect(screen.getByTestId("sessions-list")).toBeInTheDocument();
    });
  });

  it("client name links to client detail page", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("heading", { name: /Jane Smith/ }));

    const clientLinks = screen.getAllByRole("link", { name: "Jane Smith" });
    expect(clientLinks[0]).toHaveAttribute("href", "/clients/1");
  });

  it("does not show missed reason when status is Attended", async () => {
    renderDetailPage({ status: "Attended", missed_reason: null });
    await waitFor(() => screen.getByText("Attended"));
    expect(screen.queryByText(/missed reason/i)).not.toBeInTheDocument();
  });

  it("shows missed reason when session was not attended", async () => {
    renderDetailPage({ status: "DNA", missed_reason: "Illness" });
    await waitFor(() => {
      expect(screen.getByText("Illness")).toBeInTheDocument();
    });
  });

  it("renders notes when present", async () => {
    renderDetailPage({ notes: "Important session notes." });
    await waitFor(() => {
      expect(screen.getByText("Important session notes.")).toBeInTheDocument();
    });
  });

  it("does not render notes section when notes are null", async () => {
    renderDetailPage({ notes: null });
    await waitFor(() => screen.getByRole("heading", { name: /Jane Smith/ }));
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("shows not-found state when fetch fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:get") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1"]}>
                <Routes>
                  <Route path="/sessions/:id" element={<SessionDetailPage />} />
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
