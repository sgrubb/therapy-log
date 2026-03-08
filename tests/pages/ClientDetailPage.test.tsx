import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import ClientDetailPage from "@/pages/ClientDetailPage";
import { wrapped, mockTherapists, mockClient, mockSession, mockSessions, errorResponse } from "../helpers/ipc-mocks";

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
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "client:get") return Promise.resolve(clientData === null ? errorResponse.notFound : wrapped(clientData));
    if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
    return Promise.resolve(wrapped(null));
  });

  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/clients/1"]}>
        <Routes>
          <Route path="/clients">
            <Route path=":id" element={<ClientDetailPage />} />
            <Route path=":id/edit" element={<div data-testid="client-edit-form" />} />
            <Route index element={<div data-testid="clients-list" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
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
    renderDetailPage({ is_closed: true });
    await waitFor(() => {
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
  });

  it("renders session history with correct columns", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText("Child")).toBeInTheDocument();
      expect(screen.getByText("Attended")).toBeInTheDocument();
      expect(screen.getByText("FaceToFace")).toBeInTheDocument();
    });
  });

  it("shows no sessions message when session list is empty", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(mockClient));
      if (channel === "session:list") return Promise.resolve(wrapped([]));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no sessions recorded/i)).toBeInTheDocument();
    });
  });

  it("navigates to edit page when Edit is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("button", { name: /edit/i }));

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-edit-form")).toBeInTheDocument();
    });
  });

  it("navigates to /clients when Back is clicked", async () => {
    renderDetailPage();
    await waitFor(() =>
      screen.getByRole("button", { name: /back to clients/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: /back to clients/i }));

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
  });

  it("redirects to /clients when client is not found", async () => {
    renderDetailPage(null);

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
  });

  it("formats date of birth in en-GB locale", async () => {
    renderDetailPage();
    const expectedDob = mockClient.dob.toLocaleDateString("en-GB");
    await waitFor(() => {
      expect(screen.getByText(expectedDob)).toBeInTheDocument();
    });
  });

  it("formats session date in en-GB locale", async () => {
    renderDetailPage();
    const expectedDate = mockSession.scheduled_at.toLocaleDateString("en-GB");
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
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return clientPromise.then((data) => wrapped(data));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClient(mockClient);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("navigates to /clients when fetch throws", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.reject(new Error("Network error"));
      if (channel === "session:list") return Promise.resolve(wrapped([]));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients">
              <Route path=":id" element={<ClientDetailPage />} />
              <Route index element={<div data-testid="clients-list" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
  });

  it("only shows sessions belonging to the current client", async () => {
    const otherClientSession = {
      ...mockSessions[0],
      client_id: 99,
      session_type: "Parent",
    };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(mockClient));
      if (channel === "session:list")
        return Promise.resolve(wrapped([...mockSessions, otherClientSession]));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByText("Child"));
    expect(screen.queryByText("Parent")).not.toBeInTheDocument();
  });

  it("renders sessions newest first", async () => {
    const olderSession = {
      ...mockSessions[0],
      scheduled_at: new Date("2025-01-10T10:00:00.000Z"),
      session_type: "Parent",
    };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(mockClient));
      // older session comes first in the array but should sort to second row
      if (channel === "session:list")
        return Promise.resolve(wrapped([olderSession, ...mockSessions]));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByText("Child"));

    const dataRows = screen.getAllByRole("row").slice(1); // skip header
    expect(dataRows[0]).toHaveTextContent("Child"); // newer: 2026-03-10
    expect(dataRows[1]).toHaveTextContent("Parent"); // older: 2025-01-10
  });

  it("shows disabled Add Session button", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.getByRole("button", { name: /add session/i })).toBeDisabled();
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
    renderDetailPage({ is_closed: true });
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
    const closedClient = { ...mockClient, is_closed: true, outcome: "Improved" as const };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(mockClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:close") return Promise.resolve(wrapped(closedClient));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    // select outcome
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(closedClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:close") return Promise.resolve(wrapped(closedClient));
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:close",
        expect.objectContaining({
          data: expect.objectContaining({ outcome: "Improved" }),
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
    const closedClient = { ...clientWithNotes, is_closed: true, outcome: "Improved" as const };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(clientWithNotes));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:close") return Promise.resolve(wrapped(closedClient));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /close client/i }));
    fireEvent.click(screen.getByRole("button", { name: /close client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /close client/i }));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Improved" } });
    await user.type(screen.getByLabelText(/closing notes/i), "Discharge summary.");

    fireEvent.click(screen.getByRole("button", { name: /confirm close/i }));

    const date = new Date().toLocaleDateString("en-GB");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:close",
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Existing notes.\n\nClient closed - ${date}\nDischarge summary.`,
          }),
        }),
      );
    });
  });

  it("shows error alert when close client fails", async () => {
    localStorage.setItem("selectedTherapistId", "1");

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(mockClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:update") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
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
});

// ── Reopen client ─────────────────────────────────────────────────────────────

describe("ClientDetailPage — reopen client", () => {
  it("shows Reopen Client button to the client's assigned therapist when client is closed", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ is_closed: true });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("shows Reopen Client button to an admin when client is closed", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice, is_admin: true
    renderDetailPage({ is_closed: true, therapist_id: 2 });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("hides Reopen Client button from a non-admin who is not the client's therapist", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob, is_admin: false
    renderDetailPage({ is_closed: true, therapist_id: 1 }); // client belongs to Alice
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("hides Reopen Client button when client is open", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ is_closed: false });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("hides Reopen Client button when no therapist is selected", async () => {
    renderDetailPage({ is_closed: true });
    await waitFor(() => screen.getByText("Jane Smith"));
    expect(screen.queryByRole("button", { name: /reopen client/i })).not.toBeInTheDocument();
  });

  it("opens the reopen client dialog when button is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderDetailPage({ is_closed: true });
    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));

    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reopen client/i })).toBeInTheDocument();
    });
  });

  it("submits reopen client and refreshes client data", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, is_closed: true, post_score: 5, outcome: "Improved" as const };
    const reopenedClient = { ...mockClient, is_closed: false, post_score: null, outcome: null };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(closedClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:reopen") return Promise.resolve(wrapped(reopenedClient));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(reopenedClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:reopen") return Promise.resolve(wrapped(reopenedClient));
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
    const closedClient = { ...mockClient, is_closed: true, notes: "Existing notes.", outcome: "Improved" as const };
    const reopenedClient = { ...mockClient, is_closed: false, post_score: null, outcome: null };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(closedClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:reopen") return Promise.resolve(wrapped(reopenedClient));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /reopen client/i }));
    fireEvent.click(screen.getByRole("button", { name: /reopen client/i }));
    await waitFor(() => screen.getByRole("heading", { name: /reopen client/i }));

    await user.type(screen.getByLabelText(/reopen notes/i), "Returning for further support.");

    fireEvent.click(screen.getByRole("button", { name: /confirm reopen/i }));

    const date = new Date().toLocaleDateString("en-GB");
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:reopen",
        expect.objectContaining({
          data: expect.objectContaining({
            notes: `Existing notes.\n\nClient reopened - ${date}\nReturning for further support.`,
          }),
        }),
      );
    });
  });

  it("shows error alert when reopen client fails", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const closedClient = { ...mockClient, is_closed: true };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "client:get") return Promise.resolve(wrapped(closedClient));
      if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
      if (channel === "client:reopen") return Promise.resolve({ success: false, error: { code: "UNKNOWN", message: "Unexpected error." } });
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/clients/1"]}>
          <Routes>
            <Route path="/clients/:id" element={<ClientDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
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
    renderDetailPage({ is_closed: true });

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
