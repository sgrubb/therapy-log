import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import ClientDetailPage from "@/pages/ClientDetailPage";
import { wrapped, mockTherapists, mockClient, mockSessions, errorResponse } from "../helpers/ipc-mocks";

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
    const expectedDate = mockSessions[0].scheduled_at.toLocaleDateString("en-GB");
    await waitFor(() => {
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });
  });

  it("shows dash for null optional fields", async () => {
    // mockClient has null: email, pre_score, post_score, outcome
    renderDetailPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBe(4);
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
