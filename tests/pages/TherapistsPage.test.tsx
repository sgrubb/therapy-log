import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import TherapistsPage from "@/pages/TherapistsPage";
import { wrapped, mockTherapists } from "../helpers/ipc-mocks";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderPage() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    return Promise.resolve(wrapped(null));
  });

  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/therapists"]}>
        <Routes>
          <Route path="/therapists">
            <Route index element={<TherapistsPage />} />
            <Route path="new" element={<div data-testid="therapist-new-form" />} />
            <Route path=":id/edit" element={<div data-testid="therapist-edit-form" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

describe("TherapistsPage", () => {
  it("renders therapist names in the table", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Morgan")).toBeInTheDocument();
      expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching", async () => {
    let resolve!: (v: typeof mockTherapists) => void;
    const promise = new Promise<typeof mockTherapists>((res) => { resolve = res; });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return promise.then((data) => wrapped(data));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/therapists"]}>
          <Routes>
            <Route path="/therapists" element={<TherapistsPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve(mockTherapists);
    await waitFor(() => screen.getByText("Alice Morgan"));
  });

  it("shows Add Therapist button to admin users", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan, is_admin: true
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add therapist/i })).toBeInTheDocument();
    });
  });

  it("hides Add Therapist button from non-admin users", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));
    expect(screen.queryByRole("button", { name: /add therapist/i })).not.toBeInTheDocument();
  });

  it("hides Add Therapist button when no therapist is selected", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));
    expect(screen.queryByRole("button", { name: /add therapist/i })).not.toBeInTheDocument();
  });

  it("navigates to /therapists/new when Add Therapist is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /add therapist/i }));

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(screen.getByTestId("therapist-new-form")).toBeInTheDocument();
    });
  });

  it("navigates to edit page when a row is clicked", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    fireEvent.click(screen.getByText("Alice Morgan"));

    await waitFor(() => {
      expect(screen.getByTestId("therapist-edit-form")).toBeInTheDocument();
    });
  });

  it("shows admin column with tick only for admin users", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // admin
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    // Alice is admin — should show tick; Bob is not — tick absent for his row
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("✓"); // Alice
    expect(rows[1]).not.toHaveTextContent("✓"); // Bob
  });

  it("hides admin column for non-admin users", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // non-admin
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows error message from navigation state", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter
          initialEntries={[{ pathname: "/therapists", state: { error: "Access denied." } }]}
        >
          <Routes>
            <Route path="/therapists" element={<TherapistsPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    });
  });

  it("shows empty state when no therapists exist", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped([]));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/therapists"]}>
          <Routes>
            <Route path="/therapists" element={<TherapistsPage />} />
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no therapists found/i)).toBeInTheDocument();
    });
  });
});
