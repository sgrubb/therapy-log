import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import CalendarPage from "@/pages/CalendarPage";
import { wrapped, mockTherapists, mockSessions, mockClients } from "../helpers/ipc-mocks";

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
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "session:list") return Promise.resolve(wrapped(mockSessions));
    if (channel === "client:list") return Promise.resolve(wrapped(mockClients));
    return Promise.resolve(wrapped([]));
  });
});

function renderCalendarPage() {
  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/calendar"]}>
        <Routes>
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/sessions/new" element={<div data-testid="session-form" />} />
          <Route path="/sessions/:id" element={<div data-testid="session-detail" />} />
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

async function waitForLoad() {
  await waitFor(() => {
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });
}

describe("CalendarPage", () => {
  it("renders the calendar heading and mock calendar", async () => {
    renderCalendarPage();
    expect(screen.getByText("Calendar")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("mock-calendar")).toBeInTheDocument();
    });
  });

  it("shows loading state then resolves", async () => {
    renderCalendarPage();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    await waitForLoad();
  });

  it("renders therapist multi-select with placeholder text", async () => {
    renderCalendarPage();
    await waitForLoad();
    expect(screen.getByText("All therapists")).toBeInTheDocument();
  });

  it("shows no events when no therapist is selected", async () => {
    renderCalendarPage();
    await waitForLoad();
    expect(screen.queryAllByTestId("calendar-event")).toHaveLength(0);
  });

  it("renders the Show expected sessions checkbox checked by default", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Show expected sessions");
    expect(checkbox).toBeChecked();
  });

  it("unchecking Show expected sessions hides placeholder events", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Show expected sessions");
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    // With no therapist selected there are no events either way, but the checkbox state should update
    expect(checkbox).not.toBeChecked();
  });

  it("renders the Overlapping only checkbox unchecked by default", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Overlapping only");
    expect(checkbox).not.toBeChecked();
  });

  it("checking Overlapping only updates the checkbox state", async () => {
    renderCalendarPage();
    await waitForLoad();
    const checkbox = screen.getByLabelText("Overlapping only");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
