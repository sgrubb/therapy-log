import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import TherapistsPage from "@/pages/TherapistsPage";
import { wrapped, wrappedPaginated, mockTherapists } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function defaultMock() {
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
    if (channel === "therapist:list") { return Promise.resolve(wrappedPaginated(mockTherapists)); }
    return Promise.resolve(wrapped(null));
  });
}

function renderPage() {
  defaultMock();

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <SelectedTherapistProvider>
          <MemoryRouter initialEntries={["/therapists"]}>
            <Routes>
              <Route path="/therapists">
                <Route index element={<TherapistsPage />} />
                <Route path="new" element={<div data-testid="therapist-new-form" />} />
                <Route path=":id/edit" element={<div data-testid="therapist-edit-form" />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </SelectedTherapistProvider>
      </Suspense>
    </QueryClientProvider>,
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
    type WrappedPaginatedTherapists = ReturnType<typeof wrappedPaginated<(typeof mockTherapists)[0]>>;
    let resolve!: (v: WrappedPaginatedTherapists) => void;
    const promise = new Promise<WrappedPaginatedTherapists>((res) => { resolve = res; });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped(mockTherapists)); }
      if (channel === "therapist:list") { return promise; }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/therapists"]}>
              <Routes>
                <Route path="/therapists" element={<TherapistsPage />} />
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolve(wrappedPaginated(mockTherapists));
    await waitFor(() => screen.getByText("Alice Morgan"));
  });

  it("shows Add Therapist link to admin users", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan, is_admin: true
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("link", { name: /add therapist/i })).toBeInTheDocument();
    });
  });

  it("hides Add Therapist link from non-admin users", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));
    expect(screen.queryByRole("link", { name: /add therapist/i })).not.toBeInTheDocument();
  });

  it("hides Add Therapist link when no therapist is selected", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));
    expect(screen.queryByRole("link", { name: /add therapist/i })).not.toBeInTheDocument();
  });

  it("navigates to /therapists/new when Add Therapist is clicked", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderPage();
    await waitFor(() => screen.getByRole("link", { name: /add therapist/i }));

    fireEvent.click(screen.getByRole("link", { name: /add therapist/i }));

    await waitFor(() => {
      expect(screen.getByTestId("therapist-new-form")).toBeInTheDocument();
    });
  });

  it("navigates to edit page when an admin clicks a row", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan, is_admin: true
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    fireEvent.click(screen.getByText("Alice Morgan"));

    await waitFor(() => {
      expect(screen.getByTestId("therapist-edit-form")).toBeInTheDocument();
    });
  });

  it("does not navigate when a non-admin clicks a row", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    fireEvent.click(screen.getByText("Alice Morgan"));

    await waitFor(() => screen.getByText("Bob Chen"));
    expect(screen.queryByTestId("therapist-edit-form")).not.toBeInTheDocument();
  });

  it("shows admin column with tick only for admin users", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // admin
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    // Mock returns Alice Morgan first, Bob Chen second
    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]!.querySelector("svg")).toBeInTheDocument(); // Alice has icon
    expect(rows[1]!.querySelector("svg")).not.toBeInTheDocument(); // Bob has no icon
  });

  it("hides admin column for non-admin users", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // non-admin
    renderPage();
    await waitFor(() => screen.getByText("Alice Morgan"));

    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows error message from navigation state", async () => {
    defaultMock();

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter
              initialEntries={[{ pathname: "/therapists", state: { error: "Access denied." } }]}
            >
              <Routes>
                <Route path="/therapists" element={<TherapistsPage />} />
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Access denied.");
    });
  });

  it("shows empty state when no therapists exist", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list-all") { return Promise.resolve(wrapped([])); }
      if (channel === "therapist:list") { return Promise.resolve(wrappedPaginated([])); }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>
            <MemoryRouter initialEntries={["/therapists"]}>
              <Routes>
                <Route path="/therapists" element={<TherapistsPage />} />
              </Routes>
            </MemoryRouter>
          </SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/no therapists found/i)).toBeInTheDocument();
    });
  });
});
