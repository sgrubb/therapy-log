import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import SessionsPage from "@/pages/SessionsPage";

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

const mockClientBase = {
  hospital_number: "HN001",
  dob: new Date("2000-01-01T00:00:00.000Z"),
  address: null,
  phone: "07700900001",
  email: null,
  session_day: null,
  session_time: null,
  is_closed: false,
  pre_score: null,
  post_score: null,
  outcome: null,
  notes: null,
};

const mockSessions = [
  {
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
  },
  {
    id: 2,
    client_id: 2,
    therapist_id: 2,
    scheduled_at: new Date("2024-02-20T14:00:00.000Z"),
    occurred_at: null,
    status: "DNA",
    session_type: "Parent",
    delivery_method: "Online",
    missed_reason: "Illness",
    notes: null,
    client: {
      ...mockClientBase,
      id: 2,
      first_name: "Tom",
      last_name: "Jones",
      therapist_id: 2,
      hospital_number: "HN002",
    },
    therapist: mockTherapists[1],
  },
];

function wrapped<T>(data: T) {
  return { success: true, data };
}

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
    return Promise.resolve(wrapped([]));
  });
});

function renderSessionsPage() {
  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/sessions"]}>
        <Routes>
          <Route path="/sessions">
            <Route index element={<SessionsPage />} />
            <Route path="new" element={<div data-testid="session-form" />} />
            <Route path=":id" element={<div data-testid="session-detail" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

// The mocked Select renders three native <select> elements in this order:
// 0 = client filter, 1 = therapist filter, 2 = status filter
function getClientFilterSelect() {
  return screen.getAllByRole("combobox")[0]!;
}
function getTherapistFilterSelect() {
  return screen.getAllByRole("combobox")[1]!;
}
function getStatusFilterSelect() {
  return screen.getAllByRole("combobox")[2]!;
}

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
      expect(screen.getByText("Attended")).toBeInTheDocument();
      expect(screen.getByText("DNA")).toBeInTheDocument();
    });
  });

  it("renders sessions sorted by date descending (most recent first)", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    const rows = screen.getAllByRole("row").slice(1); // skip header
    expect(rows[0]).toHaveTextContent("Jane Smith"); // 2024-03-10
    expect(rows[1]).toHaveTextContent("Tom Jones");  // 2024-02-20
  });

  it("shows loading state while fetching sessions", async () => {
    let resolveSessions!: (v: typeof mockSessions) => void;
    const sessionsPromise = new Promise<typeof mockSessions>((res) => {
      resolveSessions = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return sessionsPromise.then((d) => wrapped(d));
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSessions(mockSessions);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("shows empty state when no sessions found", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return Promise.resolve(wrapped([]));
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it("renders without crashing when session:list fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "session:list") return Promise.reject(new Error("DB error"));
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it("filters by therapist", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getTherapistFilterSelect(), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
    });
  });

  it("filters by client", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getClientFilterSelect(), { target: { value: "2" } });

    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("filters by status", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getStatusFilterSelect(), { target: { value: "DNA" } });

    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("filters by from date", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Tom Jones"));

    fireEvent.change(screen.getByLabelText("From date"), {
      target: { value: "2024-03-01" },
    });

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
    });
  });

  it("filters by to date", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(screen.getByLabelText("To date"), {
      target: { value: "2024-02-28" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("resets to show all sessions when filters are cleared", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    fireEvent.change(getTherapistFilterSelect(), { target: { value: "1" } });
    await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());

    fireEvent.change(getTherapistFilterSelect(), { target: { value: "all" } });
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
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
    await waitFor(() => screen.getByRole("button", { name: /log session/i }));

    fireEvent.click(screen.getByRole("button", { name: /log session/i }));

    await waitFor(() => {
      expect(screen.getByTestId("session-form")).toBeInTheDocument();
    });
  });

  describe("column sorting", () => {
    it("sorts by date ascending when Date header is clicked", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("columnheader", { name: /date/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Tom Jones");  // Feb 2024
      expect(rows[1]).toHaveTextContent("Jane Smith"); // Mar 2024
    });

    it("reverses sort direction when the same header is clicked again", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("columnheader", { name: /date/i }));
      fireEvent.click(screen.getByRole("columnheader", { name: /date/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Jane Smith"); // back to desc
      expect(rows[1]).toHaveTextContent("Tom Jones");
    });

    it("sorts by client last name ascending when Client header is clicked", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("columnheader", { name: /client/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Tom Jones");  // Jones < Smith
      expect(rows[1]).toHaveTextContent("Jane Smith");
    });

    it("sorts by status ascending when Status header is clicked", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("columnheader", { name: /status/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Jane Smith"); // Attended < DNA
      expect(rows[1]).toHaveTextContent("Tom Jones");
    });

    it("resets to ascending when a different column header is clicked", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      // Sort date ascending
      fireEvent.click(screen.getByRole("columnheader", { name: /date/i }));
      // Now switch to client — should be ascending (Jones before Smith)
      fireEvent.click(screen.getByRole("columnheader", { name: /client/i }));

      const rows = screen.getAllByRole("row").slice(1);
      expect(rows[0]).toHaveTextContent("Tom Jones");
      expect(rows[1]).toHaveTextContent("Jane Smith");
    });

    it("shows ↓ on the Date header by default and ↑ after clicking", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      const dateHeader = screen.getByRole("columnheader", { name: /date/i });
      expect(dateHeader).toHaveTextContent("↓");

      fireEvent.click(dateHeader);
      expect(dateHeader).toHaveTextContent("↑");
    });

    it("moves the sort indicator to the newly clicked column", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("columnheader", { name: /client/i }));

      expect(screen.getByRole("columnheader", { name: /client/i })).toHaveTextContent("↑");
      expect(screen.getByRole("columnheader", { name: /date/i })).not.toHaveTextContent("↑");
      expect(screen.getByRole("columnheader", { name: /date/i })).not.toHaveTextContent("↓");
    });
  });

  describe("Show mine checkbox", () => {
    it("does not show the checkbox when no therapist is selected", async () => {
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    });

    it("shows the checkbox when a therapist is selected in context", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeInTheDocument();
    });

    it("checking Mine filters sessions to the selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("checkbox"));

      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
      });
    });

    it("unchecking Mine resets the filter to show all sessions", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("checkbox"));
      await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());

      fireEvent.click(screen.getByRole("checkbox"));
      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("Tom Jones")).toBeInTheDocument();
      });
    });

    it("checkbox becomes checked when therapist dropdown is set to the selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).not.toBeChecked();

      fireEvent.change(getTherapistFilterSelect(), { target: { value: "1" } });

      await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());
    });

    it("checkbox becomes unchecked when therapist dropdown is changed away from selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("checkbox"));
      await waitFor(() => expect(screen.getByRole("checkbox")).toBeChecked());

      fireEvent.change(getTherapistFilterSelect(), { target: { value: "all" } });
      await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    });
  });
});
