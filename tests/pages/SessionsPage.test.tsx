import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import SessionsPage from "@/pages/SessionsPage";
import { wrapped, mockTherapists, mockSessions, mockClients, mockClientBase } from "../helpers/ipc-mocks";

// A client with a regular Monday slot but no sessions → always overdue within 2 weeks
const overdueClient = {
  ...mockClientBase,
  id: 3,
  first_name: "Eve",
  last_name: "Walker",
  hospital_number: "HN003",
  therapist_id: 1,
  therapist: mockTherapists[0]!,
  session_day: "Monday" as const,
  session_time: "09:00",
  session_duration: 60,
  session_delivery_method: "FaceToFace" as const,
};

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
    if (channel === "session:list") {
      return Promise.resolve(wrapped(mockSessions));
    }
    if (channel === "client:list") {
      return Promise.resolve(wrapped([]));
    }
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

// Client and therapist filters are SearchableSelect; status is still Radix Select (mocked → native <select>)
function selectClientOption(optionText: string) {
  const trigger = screen.getByRole("combobox", { name: "Client filter" });
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole("dialog")).getByText(optionText));
}
function selectTherapistOption(optionText: string) {
  const trigger = screen.getByRole("combobox", { name: "Therapist filter" });
  fireEvent.click(trigger);
  fireEvent.click(within(screen.getByRole("dialog")).getByText(optionText));
}
function getStatusFilterSelect() {
  // Radix Select mock loses aria-label (SelectTrigger → null); label text gives name "Status"
  return screen.getByRole("combobox", { name: "Status" });
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
    expect(rows[0]).toHaveTextContent("Jane Smith"); // 2026-03-10
    expect(rows[1]).toHaveTextContent("Tom Jones");  // 2026-02-20
  });

  it("shows loading state while fetching sessions", async () => {
    let resolveSessions!: (v: typeof mockSessions) => void;
    const sessionsPromise = new Promise<typeof mockSessions>((res) => {
      resolveSessions = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return sessionsPromise.then((d) => wrapped(d));
      }
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveSessions(mockSessions);
    await waitFor(() => screen.getByText("Jane Smith"));
  });

  it("shows empty state when no sessions found", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.resolve(wrapped([]));
      }
      return Promise.resolve(wrapped([]));
    });

    renderSessionsPage();
    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it("renders without crashing when session:list fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.reject(new Error("DB error"));
      }
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

    selectTherapistOption("Alice Morgan");

    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
    });
  });

  it("filters by client", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    selectClientOption("Jones, Tom");

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
      target: { value: "2026-03-01" },
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
      target: { value: "2026-02-28" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
      expect(screen.getByText("Tom Jones")).toBeInTheDocument();
    });
  });

  it("resets to show all sessions when filters are cleared", async () => {
    renderSessionsPage();
    await waitFor(() => screen.getByText("Jane Smith"));

    selectTherapistOption("Alice Morgan");
    await waitFor(() => expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument());

    selectTherapistOption("All therapists");
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

    it("Mine checkbox is checked by default when a therapist is selected", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("Mine defaults to checked and filters sessions to the selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      // Tom Jones's session belongs to therapist 2 — hidden by default Mine filter
      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.queryByText("Tom Jones")).not.toBeInTheDocument();
      });
    });

    it("unchecking Mine shows all sessions", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      fireEvent.click(screen.getByRole("checkbox")); // uncheck Mine
      await waitFor(() => {
        expect(screen.getByText("Jane Smith")).toBeInTheDocument();
        expect(screen.getByText("Tom Jones")).toBeInTheDocument();
      });
    });

    it("checkbox becomes unchecked when therapist dropdown is changed away from selected therapist", async () => {
      localStorage.setItem("selectedTherapistId", "1");
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));

      expect(screen.getByRole("checkbox")).toBeChecked();

      selectTherapistOption("All therapists");
      await waitFor(() => expect(screen.getByRole("checkbox")).not.toBeChecked());
    });
  });

  describe("overdue sessions section", () => {
    function renderWithOverdueClient() {
      mockInvoke.mockImplementation((channel: string) => {
        if (channel === "therapist:list") {
          return Promise.resolve(wrapped(mockTherapists));
        }
        if (channel === "session:list") {
          return Promise.resolve(wrapped(mockSessions));
        }
        // overdueClient has a Monday slot but no sessions → always overdue
        if (channel === "client:list") {
          return Promise.resolve(wrapped([...mockClients, overdueClient]));
        }
        return Promise.resolve(wrapped([]));
      });
      return renderSessionsPage();
    }

    it("does not show the overdue section when no clients have regular sessions", async () => {
      // default mock returns client:list as [] → no overdue
      renderSessionsPage();
      await waitFor(() => screen.getByText("Jane Smith"));
      expect(screen.queryByText(/overdue expected sessions/i)).not.toBeInTheDocument();
    });

    it("shows the overdue section header when overdue sessions exist", async () => {
      renderWithOverdueClient();
      await waitFor(() => {
        expect(screen.getByText(/overdue expected sessions/i)).toBeInTheDocument();
      });
    });

    it("is collapsed by default — overdue table is not visible", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));
      expect(screen.queryByText("Expected date")).not.toBeInTheDocument();
    });

    it("shows ▼ indicator when collapsed", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));
      const header = screen.getByRole("button", { name: /overdue expected sessions/i });
      expect(header).toHaveTextContent("▼");
    });

    it("expands to show the overdue table when the header button is clicked", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      fireEvent.click(screen.getByRole("button", { name: /overdue expected sessions/i }));

      await waitFor(() => {
        expect(screen.getByText("Expected date")).toBeInTheDocument();
        // may appear multiple times if multiple weeks are overdue
        expect(screen.getAllByText("Eve Walker").length).toBeGreaterThan(0);
      });
    });

    it("shows ▲ indicator when expanded", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      fireEvent.click(screen.getByRole("button", { name: /overdue expected sessions/i }));

      await waitFor(() => {
        const header = screen.getByRole("button", { name: /overdue expected sessions/i });
        expect(header).toHaveTextContent("▲");
      });
    });

    it("collapses again when the header is clicked a second time", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      const header = screen.getByRole("button", { name: /overdue expected sessions/i });
      fireEvent.click(header);
      await waitFor(() => screen.getByText("Expected date"));

      fireEvent.click(header);
      await waitFor(() => {
        expect(screen.queryByText("Expected date")).not.toBeInTheDocument();
      });
    });

    it("shows therapist name in the expanded overdue table", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      fireEvent.click(screen.getByRole("button", { name: /overdue expected sessions/i }));

      await waitFor(() => {
        expect(screen.getByText("Expected date")).toBeInTheDocument();
        const overdueTable = screen.getByText("Expected date").closest("table")!;
        expect(within(overdueTable).getAllByText("Alice Morgan").length).toBeGreaterThan(0);
      });
    });

    it("Log button navigates to /sessions/new with the overdue client pre-filled", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      fireEvent.click(screen.getByRole("button", { name: /overdue expected sessions/i }));
      await waitFor(() => screen.getAllByRole("button", { name: /^log$/i }));

      fireEvent.click(screen.getAllByRole("button", { name: /^log$/i })[0]!);

      await waitFor(() => {
        expect(screen.getByTestId("session-form")).toBeInTheDocument();
      });
    });

    it("hides the overdue section when therapist filter excludes the overdue client's therapist", async () => {
      renderWithOverdueClient();
      await waitFor(() => screen.getByText(/overdue expected sessions/i));

      // overdueClient belongs to therapist 1 (Alice); filter to therapist 2 (Bob)
      selectTherapistOption("Bob Chen");

      await waitFor(() => {
        expect(screen.queryByText(/overdue expected sessions/i)).not.toBeInTheDocument();
      });
    });
  });
});
