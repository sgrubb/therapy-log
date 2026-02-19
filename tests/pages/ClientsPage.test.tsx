import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import ClientsPage from "@/pages/ClientsPage";

// Replace Radix Select with native <select> so filter interactions are testable.
// SelectTrigger returns null; Select itself renders the native combobox.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children: React.ReactNode;
  }) => (
    <select
      value={value ?? ""}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
  SelectLabel: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectSeparator: () => null,
  SelectScrollUpButton: () => null,
  SelectScrollDownButton: () => null,
}));

const mockTherapists = [
  { id: 1, first_name: "Alice", last_name: "Morgan", is_admin: true },
  { id: 2, first_name: "Bob", last_name: "Chen", is_admin: false },
];

const mockClients = [
  {
    id: 1,
    first_name: "Jane",
    last_name: "Smith",
    hospital_number: "HN001",
    therapist_id: 1,
    therapist: mockTherapists[0],
    session_day: "Monday",
    is_closed: false,
    dob: new Date("2000-01-01T00:00:00.000Z"),
    address: null,
    phone: "07700900001",
    email: null,
    session_time: null,
    pre_score: null,
    post_score: null,
    outcome: null,
    notes: null,
  },
  {
    id: 2,
    first_name: "Tom",
    last_name: "Jones",
    hospital_number: "HN002",
    therapist_id: 2,
    therapist: mockTherapists[1],
    session_day: null,
    is_closed: true,
    dob: new Date("1995-05-10T00:00:00.000Z"),
    address: null,
    phone: null,
    email: "tom@example.com",
    session_time: null,
    pre_score: null,
    post_score: null,
    outcome: null,
    notes: null,
  },
];

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") return Promise.resolve(mockTherapists);
    if (channel === "client:list") return Promise.resolve(mockClients);
    return Promise.resolve([]);
  });
});

function renderClientsPage() {
  return render(
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
    </TherapistProvider>,
  );
}

// Helpers — the mocked Select renders two native <select> elements:
// index 0 = status filter, index 1 = therapist filter
function getStatusSelect() {
  return screen.getAllByRole("combobox")[0]!;
}

function getTherapistFilterSelect() {
  return screen.getAllByRole("combobox")[1]!;
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
      screen.getByRole("button", { name: /add client/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

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
      if (channel === "therapist:list") return Promise.resolve(mockTherapists);
      if (channel === "client:list") return clientsPromise;
      return Promise.resolve([]);
    });

    renderClientsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClients(mockClients);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("renders without crashing when client:list fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(mockTherapists);
      if (channel === "client:list") return Promise.reject(new Error("DB error"));
      return Promise.resolve([]);
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
  });

  it("filters clients by therapist", async () => {
    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    fireEvent.change(getTherapistFilterSelect(), { target: { value: "1" } });

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

    const therapistSelect = getTherapistFilterSelect();
    fireEvent.change(therapistSelect, { target: { value: "1" } });
    await waitFor(() =>
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument(),
    );

    fireEvent.change(therapistSelect, { target: { value: "all" } });
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("shows selected therapist's clients first", async () => {
    // Bob Chen (therapist 2) is selected — Tom Jones (his client) should sort first
    localStorage.setItem("selectedTherapistId", "2");

    renderClientsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    const dataRows = screen.getAllByRole("row").slice(1); // skip header row
    expect(dataRows[0]).toHaveTextContent("Tom Jones");
    expect(dataRows[1]).toHaveTextContent("Jane Smith");
  });

  it("shows dash for null session day", async () => {
    renderClientsPage();
    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    // Tom Jones has session_day: null → renders "—"
    const tomRow = screen.getByText("Tom Jones").closest("tr")!;
    expect(within(tomRow).getByText("—")).toBeInTheDocument();
  });

  it("shows status badge for each client row", async () => {
    renderClientsPage();
    fireEvent.change(getStatusSelect(), { target: { value: "all" } });
    await waitFor(() => screen.getByText("Tom Jones"));

    const janeRow = screen.getByText("Jane Smith").closest("tr")!;
    const tomRow = screen.getByText("Tom Jones").closest("tr")!;

    expect(within(janeRow).getByText("Open")).toBeInTheDocument();
    expect(within(tomRow).getByText("Closed")).toBeInTheDocument();
  });

  it("shows empty state when status filter yields no results", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(mockTherapists);
      // only Tom (closed) — default "open" filter will hide him
      if (channel === "client:list") return Promise.resolve([mockClients[1]]);
      return Promise.resolve([]);
    });

    renderClientsPage();

    await waitFor(() => {
      expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    });
  });
});
