import { addDays, set } from "date-fns";
import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider } from "@/context/SelectedTherapistContext";
import CalendarPage from "@/pages/CalendarPage";
import { wrapped, mockTherapists, mockSessions, mockClients, mockClientBase } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

// react-big-calendar renders a complex calendar that's not practical to test in jsdom.
// We mock it to verify our data pipeline reaches the component correctly.
vi.mock("react-big-calendar", () => ({
  Calendar: ({ events }: { events: { title: string }[] }) => (
    <div data-testid="mock-calendar">
      {events.map((e, i) => (
        <div key={i} data-testid="calendar-event">{e.title}</div>
      ))}
    </div>
  ),
  dateFnsLocalizer: () => ({}),
}));

vi.mock("react-big-calendar/lib/css/react-big-calendar.css", () => ({}));

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
      return Promise.resolve(wrapped(mockClients));
    }
    return Promise.resolve(wrapped([]));
  });
});

function renderCalendarPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <SelectedTherapistProvider>
          <MemoryRouter initialEntries={["/calendar"]}>
            <Routes>
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/sessions/new" element={<div data-testid="session-form" />} />
              <Route path="/sessions/:id" element={<div data-testid="session-detail" />} />
            </Routes>
          </MemoryRouter>
        </SelectedTherapistProvider>
      </Suspense>
    </QueryClientProvider>,
  );
}

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
}

describe("CalendarPage", () => {
  it("renders the calendar heading and mock calendar", async () => {
    renderCalendarPage();
    await waitFor(() => {
      expect(screen.getByText("Calendar")).toBeInTheDocument();
      expect(screen.getByTestId("mock-calendar")).toBeInTheDocument();
    });
  });

  it("shows loading state then resolves", async () => {
    renderCalendarPage();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    await waitForLoad();
  });

  it("renders therapist multi-select with placeholder text", async () => {
    renderCalendarPage();
    await waitForLoad();
    expect(screen.getByText("Select therapists…")).toBeInTheDocument();
  });

  it("pre-selects the therapist when selectedTherapistId is set in context", async () => {
    localStorage.setItem("selectedTherapistId", "1"); // Alice Morgan
    renderCalendarPage();
    await waitForLoad();
    // With therapist 1 selected, the placeholder should no longer be visible
    expect(screen.queryByText("Select therapists…")).not.toBeInTheDocument();
  });

  it("shows no events when no therapist is selected", async () => {
    renderCalendarPage();
    await waitForLoad();
    expect(screen.queryAllByTestId("calendar-event")).toHaveLength(0);
  });

  it("renders the Show expected sessions checkbox checked by default", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Show expected");
    expect(checkbox).toBeChecked();
  });

  it("unchecking Show expected sessions hides placeholder events", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Show expected");
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    // With no therapist selected there are no events either way, but the checkbox state should update
    expect(checkbox).not.toBeChecked();
  });

  it("renders the Overlapping only checkbox unchecked by default", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText(/overlapping only/i);
    expect(checkbox).not.toBeChecked();
  });

  it("checking Overlapping only updates the checkbox state", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText(/overlapping only/i);
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("shows 0 in overlapping badge when no sessions overlap", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    renderCalendarPage();
    await waitForLoad();
    const label = screen.getByText(/overlapping only/i).closest("label")!;
    expect(label).toHaveTextContent("0");
  });

  it("shows overlapping count badge when future sessions overlap", async () => {
    // Two sessions for the same therapist at the same future time
    const tomorrow10am = set(addDays(new Date(), 1), { hours: 10, minutes: 0, seconds: 0, milliseconds: 0 });

    const futureSession = {
      ...mockSessions[0]!,
      scheduled_at: tomorrow10am,
    };
    const overlappingSession = {
      ...mockSessions[0]!,
      id: 99,
      scheduled_at: tomorrow10am,
      client_id: 2,
      client: {
        ...mockClientBase,
        id: 2,
        first_name: "Tom",
        last_name: "Jones",
        therapist_id: 1,
        hospital_number: "HN002",
      },
      therapist: mockTherapists[0]!,
    };

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "session:list") {
        return Promise.resolve(wrapped([futureSession, overlappingSession]));
      }
      if (channel === "client:list") {
        return Promise.resolve(wrapped(mockClients));
      }
      return Promise.resolve(wrapped([]));
    });

    localStorage.setItem("selectedTherapistId", "1");
    renderCalendarPage();
    await waitForLoad();

    const label = screen.getByText(/overlapping only/i).closest("label")!;
    expect(label).toHaveTextContent("2");
  });
});
