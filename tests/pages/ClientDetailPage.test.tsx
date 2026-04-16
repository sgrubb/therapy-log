import { format } from "date-fns";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";

function EditFormSpy() {
  const location = useLocation();
  return (
    <div
      data-testid="client-edit-form"
      data-from={(location.state as { from?: string } | null)?.from ?? ""}
    />
  );
}
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import ClientDetailPage from "@/pages/ClientDetailPage";
import { wrapped, wrappedPaginated, mockTherapists, mockClient, mockSession, mockSessions, errorResponse } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderDetailPage(clientOverride?: Partial<typeof mockClient> | null) {
  const clientData =
    clientOverride === null
      ? null
      : { ...mockClient, ...clientOverride };

  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list-all") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "client:get") {
      return Promise.resolve(clientData === null ? errorResponse.notFound : wrapped(clientData));
    }
    if (channel === "session:list-range") {
      return Promise.resolve(wrapped(mockSessions));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/clients/1"]}>
              <Routes>
                <Route path="/clients">
                  <Route path=":id" element={<ClientDetailPage />} />
                  <Route path=":id/edit" element={<EditFormSpy />} />
                  <Route index element={<div data-testid="clients-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

describe("ClientDetailPage", () => {
  it("renders client name and hospital number", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("HN001")).toBeInTheDocument();
    });
  });

  it("renders therapist name", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Morgan")).toBeInTheDocument();
    });
  });

  it("renders open badge for an open client", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  it("renders closed badge for a closed client", async () => {
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });
    await waitFor(() => {
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
  });

  it("renders session history with correct columns", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Attended")).toBeInTheDocument();
      expect(screen.getAllByText("Face to Face").length).toBeGreaterThan(0);
    });
  });

  it("shows no sessions message when session list is empty", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped([]));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no sessions recorded/i)).toBeInTheDocument();
    });
  });

  it("navigates to edit page when Edit is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("link", { name: /edit/i }));

    fireEvent.click(screen.getByRole("link", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-edit-form")).toBeInTheDocument();
    });
  });

  it("Edit link passes location state so cancel returns to detail page", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("link", { name: /edit/i }));

    fireEvent.click(screen.getByRole("link", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-edit-form")).toHaveAttribute(
        "data-from",
        "/clients/1",
      );
    });
  });

  it("navigates to /clients when Back is clicked", async () => {
    renderDetailPage();
    await waitFor(() =>
      screen.getByRole("link", { name: /back to clients/i }),
    );

    fireEvent.click(screen.getByRole("link", { name: /back to clients/i }));

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
  });

  it("redirects to /clients when client is not found", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderDetailPage(null);

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("formats date of birth in en-GB locale", async () => {
    renderDetailPage();
    const expectedDob = format(mockClient.dob, "dd MMM yyyy");
    await waitFor(() => {
      expect(screen.getByText(expectedDob)).toBeInTheDocument();
    });
  });

  it("formats session date in en-GB locale", async () => {
    renderDetailPage();
    const expectedDate = format(mockSession.scheduled_at, "dd MMM yyyy");
    await waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it("shows dash for null optional fields", async () => {
    // mockClient has null: email, pre_score (post_score/outcome hidden when open)
    renderDetailPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(2);
  });

  it("renders notes section when client has notes", async () => {
    renderDetailPage({ notes: "Some important therapy notes." });
    await waitFor(() => {
      expect(
        screen.getByText("Some important therapy notes."),
      ).toBeInTheDocument();
    });
  });

  it("does not render notes section when client notes are null", async () => {
    renderDetailPage({ notes: null });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("shows loading state while fetching", async () => {
    let resolveClient!: (v: typeof mockClient) => void;
    const clientPromise = new Promise<typeof mockClient>((res) => {
      resolveClient = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return clientPromise.then((data) => wrapped(data));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClient(mockClient);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("navigates to /clients when fetch throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.reject(new Error("Network error"));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped([]));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id" element={<ClientDetailPage />} />
                    <Route index element={<div data-testid="clients-list" />} />
                  </Route>
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

  it("only shows sessions belonging to the current client", async () => {
    // The IPC is called with clientId, so only client 1's sessions are returned.
    // Mock simulates correct backend behaviour by returning only the matching session.
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped([mockSessions[0]!]));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByText("Child"));
    expect(screen.queryByText("Parent")).not.toBeInTheDocument();
  });


  it("shows Add Session link", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.getByRole("link", { name: /add session/i })).toBeInTheDocument();
  });
});

// ── Close client ──────────────────────────────────────────────────────────────

describe("ClientDetailPage — close client", () => {
  it("shows Close Client button to the client's assigned therapist", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan, therapist_id: 1
    renderDetailPage(); // mockClient.therapist_id === 1
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close client/i })).toBeInTheDocument();
    });
  });

  it("shows Close Client button to an admin for any client", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan, is_admin: true
    renderDetailPage({ therapist_id: 2 }); // different therapist, but admin can still close
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /close client/i })).toBeInTheDocument();
    });
  });

  it("hides Close Client button from a non-admin who is not the client's therapist", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false
    renderDetailPage({ therapist_id: 1 }); // client belongs to Alice, not Bob
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /close client/i })).not.toBeInTheDocument();
  });

  it("hides Close Client button when client is already closed", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /close client/i })).not.toBeInTheDocument();
  });

  it("hides Close Client button when no therapist is selected", async () => {
    // no localStorage entry → selectedTherapistId null
    renderDetailPage();
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /close client/i })).not.toBeInTheDocument();
  });

  it("opens the close client dialog when button is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage();
    await waitFor(() => screen.getByRole("button", { name: /close client/i }));

    fireEvent.click(screen.getByRole("button", { name: /close client/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /close client/i })).toBeInTheDocument();
    });
  });

  it("shows outcome validation error when submitted without outcome", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage();
    await waitFor(() => screen.getByRole("button", { name: /close client/i }));

    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(screen.getByText(/outcome is required/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("client:update", expect.anything());
  });

  it("submits close client and refreshes client data", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, closed_date: new Date("2025-12-01T00:00:00.000Z"), outcome: "Improved" as const };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:close") {
        return Promise.resolve(wrapped(closedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    // select outcome
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(closedClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:close") {
        return Promise.resolve(wrapped(closedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:close",
        expect.objectContaining({
          data: expect.objectContaining({
            outcome: "Improved",
            closed_date: expect.any(Date),
          }),
        }),
      );
    });

    // dialog should close and badge should update
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /close client/i })).not.toBeInTheDocument();
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
  });

  it("appends closing notes to existing client notes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("selectedTherapistId", "1");
    const clientWithNotes = { ...mockClient, notes: "Existing notes." };
    const closedClient = { ...clientWithNotes, closed_date: new Date("2025-12-01T00:00:00.000Z"), outcome: "Improved" as const };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(clientWithNotes));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:close") {
        return Promise.resolve(wrapped(closedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });
    await user.type(screen.getByLabelText(/closing notes/i), "Discharge summary.");

    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:close",
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Existing notes.\n\nDischarge summary.`,
          }),
        }),
      );
    });
  });

  it("shows error alert when close client fails", async () => {
    localStorage.setItem("selectedTherapistId", "1");

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:update") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to close client/i);
    });
  });

  it("dismisses dialog without submitting when Cancel is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage();

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /close client/i })).not.toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("client:update", expect.anything());
  });

  it("defaults close date to today", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage();

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    const today = format(new Date(), "yyyy-MM-dd");
    expect((screen.getByLabelText(/close date/i) as HTMLInputElement).value).toBe(today);
  });

  it("does not modify existing notes when no closing notes are entered", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const clientWithNotes = { ...mockClient, notes: "Existing notes." };
    const closedClient = { ...clientWithNotes, closed_date: new Date("2025-12-01T00:00:00.000Z"), outcome: "Improved" as const };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
      if (channel === "client:get") { return Promise.resolve(wrapped(clientWithNotes)); }
      if (channel === "session:list-range") { return Promise.resolve(wrapped(mockSessions)); }
      if (channel === "client:close") { return Promise.resolve(wrapped(closedClient)); }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:close",
        expect.objectContaining({
          data: expect.objectContaining({ notes: "Existing notes." }),
        }),
      );
    });
  });

  it("shows closed date in client info when client is closed", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });

    await waitFor(() => {
      expect(screen.getByText("Closed Date")).toBeInTheDocument();
      expect(screen.getByText("01 Dec 2025")).toBeInTheDocument();
    });
  });
});

// ── Reopen client ─────────────────────────────────────────────────────────────

describe("ClientDetailPage — reopen client", () => {
  it("shows Reopen Client button to the client's assigned therapist when client is closed", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("shows Reopen Client button to an admin when client is closed", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice, is_admin: true
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z"), therapist_id: 2 });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("hides Reopen Client button from a non-admin who is not the client's therapist", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob, is_admin: false
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z"), therapist_id: 1 }); // client belongs to Alice
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("hides Reopen Client button when client is open", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: null });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("hides Reopen Client button when no therapist is selected", async () => {
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("opens the reopen client dialog when button is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });
    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));

    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("submits reopen client and refreshes client data", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, closed_date: new Date("2025-12-01T00:00:00.000Z"), post_score: 5, outcome: "Improved" as const };
    const reopenedClient = { ...mockClient, closed_date: null, post_score: null, outcome: null };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(closedClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:reopen") {
        return Promise.resolve(wrapped(reopenedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(reopenedClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:reopen") {
        return Promise.resolve(wrapped(reopenedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm reopen/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:reopen",
        expect.objectContaining({ id: 1 }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /reopen client/i })).not.toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  it("appends reopening notes to existing client notes", async () => {
    const user = userEvent.setup();
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, closed_date: new Date("2025-12-01T00:00:00.000Z"), notes: "Existing notes.", outcome: "Improved" as const };
    const reopenedClient = { ...mockClient, closed_date: null, post_score: null, outcome: null };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(closedClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:reopen") {
        return Promise.resolve(wrapped(reopenedClient));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    await user.type(screen.getByLabelText(/reopen notes/i), "Returning for further support.");

    fireEvent.click(screen.getByRole("button", { name: /confirm reopen/i }));

    const today = format(new Date(), "dd MMM yyyy");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:reopen",
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Existing notes.\n\nClient closed on 01 Dec 2025, Outcome: Improved\nClient reopened on ${today}\nReturning for further support.`,
          }),
        }),
      );
    });
  });

  it("shows error alert when reopen client fails", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, closed_date: new Date("2025-12-01T00:00:00.000Z") };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(closedClient));
      }
      if (channel === "session:list-range") {
        return Promise.resolve(wrapped(mockSessions));
      }
      if (channel === "client:reopen") {
        return Promise.resolve({ success: false, error: { code: "UNKNOWN", message: "Unexpected error." } });
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient2 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient2}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <SelectedTherapistProvider>
              <MemoryRouter initialEntries={["/clients/1"]}>
                <Routes>
                  <Route path="/clients/:id" element={<ClientDetailPage />} />
                </Routes>
              </MemoryRouter>
            </SelectedTherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    fireEvent.click(screen.getByRole("button", { name: /confirm reopen/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to reopen client/i);
    });
  });

  it("dismisses dialog without submitting when Cancel is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ closed_date: new Date("2025-12-01T00:00:00.000Z") });

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: /reopen client/i })).not.toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("client:reopen", expect.anything());
  });
});
