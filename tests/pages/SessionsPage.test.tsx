import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import SessionsPage from "@/pages/SessionsPage";
import { wrapped, mockTherapists, mockSessions, mockClients, mockClientBase } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");

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
      return Promise.resolve(wrapped([]));
    }
    return Promise.resolve(wrapped([]));
  });
});

function renderSessionsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/sessions"]}>
              <Routes>
                <Route path="/sessions">
                  <Route index element={<SessionsPage />} />
                  <Route path="new" element={<div data-testid="session-form" />} />
                  <Route path=":id" element={<div data-testid="session-detail" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

// A client with a regular Monday slot but no sessions → always overdue within 2 weeks
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

describe("SessionsPage", () => {
  it("renders session rows with client and therapist names", async () => {
    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
    const table = screen.getByRole("table");
    expect(within(table).getByText("Alice Morgan")).toBeInTheDocument();
    expect(within(table).getByText("Bob Chen")).toBeInTheDocument();
  });

  it("shows session type and delivery method labels", async () => {
    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Face to Face")).toBeInTheDocument();
      expect(screen.getByText("Online")).toBeInTheDocument();
    });
  });

  it("shows session statuses", async () => {
    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getAllByText("Attended").length).toBeGreaterThan(0);
      expect(screen.getAllByText("DNA").length).toBeGreaterThan(0);
    });
  });

  it("renders sessions sorted by date descending (most recent first)", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Jane Smith");
    expect(rows[1]).toHaveTextContent("Tom Jones");
  });

  it("shows loading state while fetching sessions", async () => {
    let resolveSessions!: (v: typeof mockSessions) => void;
    const sessionsPromise = new Promise<typeof mockSessions>((res) => {
      resolveSessions = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return sessionsPromise.then((d) => wrapped(d));
      }
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSessions(mockSessions);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("shows empty state when no sessions found", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.resolve(wrapped([]));
      }
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it("renders without crashing when session:list fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.reject(new Error("DB error"));
      }
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("navigates to session detail on row click", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.click(screen.getByText("Jane Smith").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByTestId("session-detail")).toBeInTheDocument();
    });
  });

  it("navigates to /sessions/new when Log Session is clicked", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByRole("link", { name: /log session/i }));

    fireEvent.click(screen.getByRole("link", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-form")).toBeInTheDocument();
    });
  });

  describe("overdue sessions section", () => {
    function renderWithOverdueClient() {
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "therapist:list") {
          return Promise.resolve(wrapped(mockTherapists));
        }
        if (channel === "session:list") {
          return Promise.resolve(wrapped(mockSessions));
        }
        if (channel === "client:list") {
          return Promise.resolve(wrapped([...mockClients, overdueClient]));
        }
        return Promise.resolve(wrapped([]));
      });
      return renderSessionsPage();
    }

    it("does not show expected sessions section when no clients have regular sessions", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));
      expect(screen.queryByText(/expected sessions/i)).not.toBeInTheDocument();
    });

    it("shows collapsible expected sessions section when overdue sessions exist", async () => {
      renderWithOverdueClient();
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /expected sessions/i })).toBeInTheDocument();
      });
    });

    it("expected sessions table is collapsed by default", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByRole("button", { name: /expected sessions/i }));
      expect(screen.queryByText("Expected date")).not.toBeInTheDocument();
    });

    it("expands expected sessions table when header button is clicked", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByRole("button", { name: /expected sessions/i }));

      fireEvent.click(screen.getByRole("button", { name: /expected sessions/i }));

      await waitFor(() => {
        expect(screen.getByText("Expected date")).toBeInTheDocument();
        expect(screen.getAllByText("Eve Walker").length).toBeGreaterThan(0);
      });
    });

    it("collapses again when header button is clicked a second time", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByRole("button", { name: /expected sessions/i }));

      const header = screen.getByRole("button", { name: /expected sessions/i });
      fireEvent.click(header);
      await waitFor(() => screen.getByText("Expected date"));

      fireEvent.click(header);
      await waitFor(() => {
        expect(screen.queryByText("Expected date")).not.toBeInTheDocument();
      });
    });

    it("shows therapist name in the expected sessions table", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByRole("button", { name: /expected sessions/i }));

      fireEvent.click(screen.getByRole("button", { name: /expected sessions/i }));

      await waitFor(() => {
        const overdueTable = screen.getByText("Expected date").closest("table")!;
        expect(within(overdueTable).getAllByText("Alice Morgan").length).toBeGreaterThan(0);
      });
    });

    it("Log link navigates to /sessions/new with the overdue client pre-filled", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByRole("button", { name: /expected sessions/i }));

      fireEvent.click(screen.getByRole("button", { name: /expected sessions/i }));
      await waitFor(() => screen.getAllByRole("link", { name: /^log$/i }));

      fireEvent.click(screen.getAllByRole("link", { name: /^log$/i })[0]!);

      await waitFor(() => {
        expect(screen.getByTestId("session-form")).toBeInTheDocument();
      });
    });
  });
});
