import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TherapistProvider } from "@/context/TherapistContext";
import ClientsPage from "@/pages/ClientsPage";
import { wrapped, mockTherapists, mockClients } from "../helpers/ipc-mocks";
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
    if (channel === "client:list") {
      return Promise.resolve(wrapped(mockClients));
    }
    return Promise.resolve(wrapped([]));
  });
});

function renderClientsPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/clients"]}>
              <Routes>
                <Route path="/clients">
                  <Route index element={<ClientsPage />} />
                  <Route path="new" element={<div data-testid="client-form" />} />
                  <Route path=":id" element={<div data-testid="client-detail" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

// Status filter is still Radix Select (mocked → native <select>)
function getStatusSelect() {
  return screen.getAllByRole("combobox")[0]!;
}

// Therapist filter is SearchableSelect — interact by clicking trigger then option
function selectTherapistOption(optionText: string) {
  const trigger = screen.getByRole("combobox", { name: "Therapist filter" });
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole("dialog")).getByText(optionText));
}

describe("ClientsPage", () => {
  it("fetches and renders open client rows (default filter)", async () => {
    renderClientsPage();
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
    // Tom Jones is closed; default status filter is "open"
    expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
  });

  it("shows hospital number and therapist name in each row", async () => {
    renderClientsPage();
    await waitFor(() => {
      expect(screen.getByText("HN001")).toBeInTheDocument();
      expect(within(screen.getByRole("table")).getByText("Alice Morgan")).toBeInTheDocument();
    });
  });

  it("shows all clients when status filter is set to all", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });

    await waitFor(() => {
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("hides open clients when status filter is set to closed", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "closed" } });

    await waitFor(() => {
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  it("filters by name via text search", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    // Switch to "all" to include both clients in the base set
    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    fireEvent.change(
      screen.getByPlaceholderText(/search name or hospital number/i),
      { target: { value: "jane" } },
    );

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
    });
  });

  it("filters by hospital number via text search", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    fireEvent.change(
      screen.getByPlaceholderText(/search name or hospital number/i),
      { target: { value: "HN002" } },
    );

    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("navigates to client detail on row click", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.click(screen.getByText("Jane Smith").closest("tr")!);

    await waitFor(() => {
      expect(screen.getByTestId("client-detail")).toBeInTheDocument();
    });
  });

  it("navigates to /clients/new when Add Client is clicked", async () => {
    renderClientsPage();
    await waitFor(() =>
      screen.getByRole("link", { name: /add client/i }),
    );

    fireEvent.click(screen.getByRole("link", { name: /add client/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-form")).toBeInTheDocument();
    });
  });

  it("shows empty state when no clients match search", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(
      screen.getByPlaceholderText(/search name or hospital number/i),
      { target: { value: "zzznomatch" } },
    );

    await waitFor(() => {
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching clients", async () => {
    let resolveClients!: (v: typeof mockClients) => void;
    const clientsPromise = new Promise<typeof mockClients>((res) => {
      resolveClients = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return clientsPromise.then((data) => wrapped(data));
      }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClients(mockClients);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("renders without crashing when client:list fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:list") {
        return Promise.reject(new Error("DB error"));
      }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    spy.mockRestore();
  });

  it("filters clients by therapist", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    selectTherapistOption("Alice Morgan");

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
    });
  });

  it("resets therapist filter to show all therapists", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    selectTherapistOption("Alice Morgan");
    await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());

    selectTherapistOption("All therapists");
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("sorts clients alphabetically by last name by default", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    const dataRows = screen.getAllByRole("row").slice(1);
    expect(dataRows[0]).toHaveTextContent("Tom Jones");  // Jones < Smith
    expect(dataRows[1]).toHaveTextContent("Jane Smith");
  });

  it("shows dash for null session day", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));
    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    // Tom Jones has session_day: null → renders "—"
    const tomRow = screen.getByText("Tom Jones").closest("tr")!;
    expect(within(tomRow).getByText("—")).toBeInTheDocument();
  });

  it("shows status badge for each client row", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));
    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    const janeRow = screen.getByText("Jane Smith").closest("tr")!;
    const tomRow = screen.getByText("Tom Jones").closest("tr")!;

    expect(within(janeRow).getByText("Open")).toBeInTheDocument();
    expect(within(tomRow).getByText("Closed")).toBeInTheDocument();
  });


  describe("Show mine checkbox", () => {
    it("does not show the checkbox when no therapist is selected", async () => {
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows the checkbox when a therapist is selected in context", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("Mine checkbox is checked by default when a therapist is selected", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("Mine defaults to checked and filters clients to the selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      // Switch to "all" statuses so Tom would be visible if not filtered by therapist
      fireEvent.change(getStatusSelect(), { target: { value: "all" } });
      // Tom (therapist 2) remains hidden because Mine is checked (therapist filter = 1)
      await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());
    });

    it("unchecking Mine shows all clients", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.change(getStatusSelect(), { target: { value: "all" } });
      // Mine checked → Tom hidden
      await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("checkbox")); // uncheck Mine
      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("Tom Jones")).toBeInTheDocument();
      });
    });

    it("checkbox becomes unchecked when therapist dropdown is changed away from selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderClientsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeChecked();

      selectTherapistOption("All therapists");
      await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    });
  });

  it("shows empty state when status filter yields no results", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      // only Tom (closed) — default "open" filter will hide him
      if (channel === "client:list") {
        return Promise.resolve(wrapped([mockClients[1]]));
      }
      return Promise.resolve(wrapped([]));
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });
  });
});
