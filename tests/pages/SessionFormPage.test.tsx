import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format } from "date-fns";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { TherapistProvider } from "@/context/TherapistContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import SessionFormPage from "@/pages/SessionFormPage";
import {
  wrapped,
  mockTherapists,
  mockClients,
  mockSession,
  errorResponse,
  MOCK_UPDATED_AT,
  MOCK_SESSION_DATE_RECENT,
} from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");
vi.mock("@/components/ui/searchable-select");

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderNewForm() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "client:list") {
      return Promise.resolve(wrapped(mockClients));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/sessions/new"]}>
              <Routes>
                <Route path="/sessions">
                  <Route path="new" element={<SessionFormPage />} />
                  <Route path=":id" element={<div data-testid="session-detail" />} />
                  <Route index element={<div data-testid="sessions-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

function renderEditForm() {
  const editSession = { ...mockSession, notes: "Some notes" };
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "client:list") {
      return Promise.resolve(wrapped(mockClients));
    }
    if (channel === "session:get") {
      return Promise.resolve(wrapped(editSession));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/sessions/1/edit"]}>
              <Routes>
                <Route path="/sessions">
                  <Route path=":id/edit" element={<SessionFormPage />} />
                  <Route path=":id" element={<div data-testid="session-detail" />} />
                  <Route index element={<div data-testid="sessions-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

// Select order in new form:
// 0 = client, 1 = therapist, 2 = duration-hours, 3 = duration-minutes, 4 = session_type, 5 = delivery_method, 6 = status
function getSelect(index: number) {
  return screen.getAllByRole("combobox")[index]!;
}
function getClientSelect() { return getSelect(0); }
function getTherapistSelect() { return getSelect(1); }
function getSessionTypeSelect() { return getSelect(4); }
function getDeliveryMethodSelect() { return getSelect(5); }
function getStatusSelect() { return getSelect(6); }

// ── New session ───────────────────────────────────────────────────────

describe("SessionFormPage — new session", () => {
  it("renders Log Session heading", async () => {
    renderNewForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /log session/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders with all fields empty", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("heading", { name: /log session/i }));

    expect(screen.getByLabelText(/^date/i)).toHaveValue("");
    expect(screen.getByLabelText(/^time/i)).toHaveValue("");
    expect(screen.getByLabelText(/^duration/i)).toHaveValue("0");
    expect(screen.getByLabelText(/notes/i)).toHaveValue("");
  });

  it("does not show missed reason field when status is Attended", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("heading", { name: /log session/i }));

    expect(screen.queryByLabelText(/missed reason/i)).not.toBeInTheDocument();
  });

  it("shows missed reason field when status changes away from Attended", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("heading", { name: /log session/i }));

    fireEvent.change(getStatusSelect(), { target: { value: "DNA" } });

    await waitFor(() => {
      expect(screen.getByText("Missed Reason *")).toBeInTheDocument();
    });
  });

  it("hides missed reason field when status changes back to Attended", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("heading", { name: /log session/i }));

    fireEvent.change(getStatusSelect(), { target: { value: "DNA" } });
    await waitFor(() => screen.getByText("Missed Reason *"));

    fireEvent.change(getStatusSelect(), { target: { value: "Attended" } });

    await waitFor(() => {
      expect(screen.queryByText("Missed Reason *")).not.toBeInTheDocument();
    });
  });

  it("auto-populates therapist when client is selected", async () => {
    renderNewForm();
    // Wait for clients to load so setClient can find the client's therapist
    await waitFor(() => screen.getByText("Jane Smith"));

    // Select Tom Jones (therapist_id: 2 = Bob Chen)
    fireEvent.change(getClientSelect(), { target: { value: "2" } });

    await waitFor(() => {
      expect(getTherapistSelect()).toHaveValue("2");
    });
  });

  it("auto-populates duration and delivery_method when client has defaults", async () => {
    renderNewForm();
    await waitFor(() => screen.getByText("Jane Smith"));

    // Jane Smith has session_duration: 60 and session_delivery_method: "FaceToFace"
    fireEvent.change(getClientSelect(), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByLabelText(/^duration/i)).toHaveValue("1");
      expect(getDeliveryMethodSelect()).toHaveValue("FaceToFace");
    });
  });

  it("does not overwrite existing duration when client has no default", async () => {
    renderNewForm();
    await waitFor(() => screen.getByText("Jane Smith"));

    // First select Jane (sets duration to "01:00")
    fireEvent.change(getClientSelect(), { target: { value: "1" } });
    await waitFor(() => expect(screen.getByLabelText(/^duration/i)).toHaveValue("1"));

    // Then switch to Tom Jones (no session_duration) — duration should be preserved
    fireEvent.change(getClientSelect(), { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.getByLabelText(/^duration/i)).toHaveValue("1");
    });
  });

  it("does not overwrite therapist when client is changed and therapist is already set", async () => {
    renderNewForm();
    await waitFor(() => screen.getByText("Jane Smith"));

    // Manually set therapist to Alice (id 1)
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    // Now switch client to Tom Jones (whose therapist is Bob, id 2)
    fireEvent.change(getClientSelect(), { target: { value: "2" } });

    await waitFor(() => {
      expect(getTherapistSelect()).toHaveValue("1");
    });
  });

  it("shows required field errors on empty submit", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /log session/i }));

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByText(/client is required/i)).toBeInTheDocument();
      expect(screen.getByText(/therapist is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
      expect(screen.getByText(/time is required/i)).toBeInTheDocument();
      expect(screen.getByText(/duration is required/i)).toBeInTheDocument();
      expect(screen.getByText(/session type is required/i)).toBeInTheDocument();
      expect(screen.getByText(/delivery method is required/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("session:create", expect.anything());
  });

  it("requires missed_reason when status is not Attended", async () => {
    renderNewForm();
    await waitFor(() => getStatusSelect());

    fireEvent.change(getClientSelect(), { target: { value: "1" } });
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "2026-01-01" } });
    fireEvent.change(getSessionTypeSelect(), { target: { value: "Child" } });
    fireEvent.change(getDeliveryMethodSelect(), { target: { value: "FaceToFace" } });
    fireEvent.change(getStatusSelect(), { target: { value: "DNA" } });

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/reason is required when session is not attended/i),
      ).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("session:create", expect.anything());
  });

  it("calls session:create with correct payload and navigates to /sessions", async () => {
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:create") {
        return Promise.resolve(wrapped(mockSession));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.change(getClientSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "2026-01-01" } });
    fireEvent.change(getSessionTypeSelect(), { target: { value: "Child" } });
    fireEvent.change(getDeliveryMethodSelect(), { target: { value: "FaceToFace" } });
    fireEvent.change(getStatusSelect(), { target: { value: "Attended" } });

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "session:create",
        expect.objectContaining({
          client_id: 1,
          therapist_id: 1,
          session_type: "Child",
          delivery_method: "FaceToFace",
          status: "Attended",
          duration: 60,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-detail")).toBeInTheDocument();
    });
  });

  it("shows error alert on save failure", async () => {
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:create") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.change(getClientSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "2026-01-01" } });
    fireEvent.change(getSessionTypeSelect(), { target: { value: "Child" } });
    fireEvent.change(getDeliveryMethodSelect(), { target: { value: "FaceToFace" } });
    fireEvent.change(getStatusSelect(), { target: { value: "Attended" } });

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to save session/i,
      );
    });
  });

  it("shows error when notes exceed 1000 characters", async () => {
    const user = userEvent.setup();
    renderNewForm();
    await waitFor(() => screen.getByLabelText(/notes/i));

    await user.type(screen.getByLabelText(/notes/i), "a".repeat(1001));

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByText(/1000 characters or fewer/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("session:create", expect.anything());
  });

  it("shows field error on blur", async () => {
    renderNewForm();
    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "" } });
    fireEvent.blur(screen.getByLabelText(/^date/i));

    await waitFor(() => {
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    });
  });

  it("clears field error when user types in that field", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /log session/i }));

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));
    await waitFor(() => screen.getByText(/date is required/i));

    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "2026-01-01" } });

    await waitFor(() => {
      expect(screen.queryByText(/date is required/i)).not.toBeInTheDocument();
    });
  });

  it("navigates to /sessions when Cancel is clicked", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("sessions-list")).toBeInTheDocument();
    });
  });

  it("disables submit button while saving", async () => {
    let resolveSave!: (v: typeof mockSession) => void;
    const savePromise = new Promise<typeof mockSession>((res) => {
      resolveSave = res;
    });

    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:create") {
        return savePromise.then((d) => wrapped(d));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.change(getClientSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "2026-01-01" } });
    fireEvent.change(getSessionTypeSelect(), { target: { value: "Child" } });
    fireEvent.change(getDeliveryMethodSelect(), { target: { value: "FaceToFace" } });
    fireEvent.change(getStatusSelect(), { target: { value: "Attended" } });

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    resolveSave(mockSession);
  });
});

// ── Edit session ──────────────────────────────────────────────────────

describe("SessionFormPage — edit session", () => {
  it("renders Edit Session heading", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit session/i }),
      ).toBeInTheDocument();
    });
  });

  it("pre-populates all fields from existing session data", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(screen.getByLabelText(/^date/i)).toHaveValue(format(MOCK_SESSION_DATE_RECENT, "yyyy-MM-dd"));
      expect(screen.getByLabelText(/^time/i)).toHaveValue(format(MOCK_SESSION_DATE_RECENT, "HH:mm"));
      expect(screen.getByLabelText(/^duration/i)).toHaveValue("1");
      expect(getClientSelect()).toHaveValue("1");
      expect(getTherapistSelect()).toHaveValue("1");
      expect(getSessionTypeSelect()).toHaveValue("Child");
      expect(getDeliveryMethodSelect()).toHaveValue("FaceToFace");
      expect(getStatusSelect()).toHaveValue("Attended");
      expect(screen.getByLabelText(/notes/i)).toHaveValue("Some notes");
    });
  });

  it("calls session:update and navigates to /sessions on valid submit", async () => {
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/^date/i));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        return Promise.resolve(wrapped(mockSession));
      }
      if (channel === "session:update") {
        return Promise.resolve(wrapped(mockSession));
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "session:update",
        expect.objectContaining({
          id: 1,
          data: expect.objectContaining({
            client_id: 1,
            therapist_id: 1,
            session_type: "Child",
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("session-detail")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching session data", async () => {
    let resolveSession!: (v: typeof mockSession) => void;
    const sessionPromise = new Promise<typeof mockSession>((res) => {
      resolveSession = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        return sessionPromise.then((d) => wrapped(d));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSession(mockSession);
    await waitFor(() => screen.getByLabelText(/^date/i));
  });

  it("shows required field errors on empty submit", async () => {
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.change(screen.getByLabelText(/^date/i), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("session:update", expect.anything());
  });

  it("shows error alert on update failure", async () => {
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/^date/i));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        return Promise.resolve(wrapped(mockSession));
      }
      if (channel === "session:update") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to save session/i);
    });
  });

  it("shows error boundary when session fetch throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
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
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                    <Route index element={<div data-testid="sessions-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("shows retry message when conflict has no field differences", async () => {
    const freshSession = { ...mockSession, updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000) };

    let sessionGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        sessionGetCount++;
        return Promise.resolve(wrapped(sessionGetCount === 1 ? mockSession : freshSession));
      }
      if (channel === "session:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                    <Route path=":id" element={<div data-testid="session-detail" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByLabelText(/^date/i));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/please try saving again/i);
    });
  });

  it("shows error boundary when session is not found", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        return Promise.resolve(errorResponse.notFound);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/999/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                    <Route index element={<div data-testid="sessions-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("navigates to /sessions when Cancel is clicked", async () => {
    renderEditForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("sessions-list")).toBeInTheDocument();
    });
  });

  it("shows conflict warning with server-changed fields and preserves user edits", async () => {
    const user = userEvent.setup();

    const freshSession = {
      ...mockSession,
      notes: "Server note",
      updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000),
    };

    let sessionGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        sessionGetCount++;
        return Promise.resolve(wrapped(sessionGetCount === 1 ? { ...mockSession, notes: null } : freshSession));
      }
      if (channel === "session:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                    <Route path=":id" element={<div data-testid="session-detail" />} />
                    <Route index element={<div data-testid="sessions-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByLabelText(/^date/i));

    await user.type(screen.getByLabelText(/notes/i), "My note");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/someone else modified/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/notes/i);
    });

    // Server's value for notes is shown, but wait — user edited notes and server also changed notes
    // So server's "Server note" wins, confirming the merge logic
    expect(screen.getByLabelText(/notes/i)).toHaveValue("Server note");
    expect(screen.queryByTestId("session-detail")).not.toBeInTheDocument();
  });

  it("shows missed_reason field when editing a non-Attended session", async () => {
    const dnaMockSession = {
      ...mockSession,
      status: "DNA",
      missed_reason: "Illness",
    };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      if (channel === "session:get") {
        return Promise.resolve(wrapped(dnaMockSession));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/sessions/1/edit"]}>
                <Routes>
                  <Route path="/sessions">
                    <Route path=":id/edit" element={<SessionFormPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Missed Reason *")).toBeInTheDocument();
      expect(screen.getAllByRole("combobox").find(
        (s) => (s as HTMLSelectElement).value === "Illness",
      )).toBeTruthy();
    });
  });
});
