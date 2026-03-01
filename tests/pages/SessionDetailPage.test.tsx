import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import SessionDetailPage from "@/pages/SessionDetailPage";
import { wrapped, mockTherapists, mockClientBase, errorResponse } from "../helpers/test-helpers";

const mockSession = {
  id: 1,
  client_id: 1,
  therapist_id: 1,
  scheduled_at: new Date("2024-03-10T10:00:00.000Z"),
  occurred_at: null,
  status: "Attended",
  session_type: "Child",
  delivery_method: "FaceToFace",
  missed_reason: null,
  notes: null,
  client: {
    ...mockClientBase,
    id: 1,
    first_name: "Jane",
    last_name: "Smith",
    therapist_id: 1,
  },
  therapist: mockTherapists[0],
};

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
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "session:get")
      return Promise.resolve(sessionData === null ? errorResponse.notFound : wrapped(sessionData));
    return Promise.resolve(wrapped(null));
  });

  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/sessions/1"]}>
        <Routes>
          <Route path="/sessions">
            <Route path=":id" element={<SessionDetailPage />} />
            <Route path=":id/edit" element={<div data-testid="session-edit-form" />} />
            <Route index element={<div data-testid="sessions-list" />} />
          </Route>
          <Route path="/clients/:id" element={<div data-testid="client-detail" />} />
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

describe("SessionDetailPage", () => {
  it("renders client and therapist names", async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Jane Smith" })).toBeInTheDocument();
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
    const date = mockSession.scheduled_at.toLocaleDateString("en-GB");
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
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:get") return sessionPromise.then((d) => wrapped(d));
      return Promise.resolve(wrapped(null));
    });

    renderDetailPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSession(mockSession);
    await waitFor(() => screen.getByRole("heading", { name: "Jane Smith" }));
  });

  it("shows not-found state when session does not exist", async () => {
    renderDetailPage(null);
    await waitFor(() => {
      expect(screen.getByText(/session not found/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /back to sessions/i })).toBeInTheDocument();
  });

  it("navigates to sessions list from not-found back button", async () => {
    renderDetailPage(null);
    await waitFor(() => screen.getByText(/session not found/i));

    fireEvent.click(screen.getByRole("button", { name: /back to sessions/i }));

    await waitFor(() => {
      expect(screen.getByTestId("sessions-list")).toBeInTheDocument();
    });
  });

  it("navigates to edit form when Edit is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("button", { name: /edit/i }));

    fireEvent.click(screen.getByRole("button", { name: /edit/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-edit-form")).toBeInTheDocument();
    });
  });

  it("navigates to sessions list when Back is clicked", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("button", { name: /back to sessions/i }));

    fireEvent.click(screen.getByRole("button", { name: /back to sessions/i }));

    await waitFor(() => {
      expect(screen.getByTestId("sessions-list")).toBeInTheDocument();
    });
  });

  it("client name links to client detail page", async () => {
    renderDetailPage();
    await waitFor(() => screen.getByRole("heading", { name: "Jane Smith" }));

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
    await waitFor(() => screen.getByRole("heading", { name: "Jane Smith" }));
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("shows not-found state when fetch fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:get") return Promise.reject(new Error("Network error"));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/sessions/1"]}>
          <Routes>
            <Route path="/sessions/:id" element={<SessionDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/session not found/i)).toBeInTheDocument();
    });
  });
});
