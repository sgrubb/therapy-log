import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TherapistProvider } from "@/context/TherapistContext";
import TherapistFormPage from "@/pages/TherapistFormPage";
import { wrapped, mockTherapists, errorResponse } from "../helpers/ipc-mocks";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

const mockTherapist = mockTherapists[0]!; // Alice Morgan, is_admin: true

function renderNewForm() {
  localStorage.setItem("selectedTherapistId", "1"); // admin

  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    return Promise.resolve(wrapped(null));
  });

  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/therapists/new"]}>
        <Routes>
          <Route path="/therapists">
            <Route path="new" element={<TherapistFormPage />} />
            <Route index element={<div data-testid="therapists-list" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

function renderEditForm() {
  localStorage.setItem("selectedTherapistId", "1"); // admin

  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
    if (channel === "therapist:get") return Promise.resolve(wrapped(mockTherapist));
    return Promise.resolve(wrapped(null));
  });

  return render(
    <TherapistProvider>
      <MemoryRouter initialEntries={["/therapists/1/edit"]}>
        <Routes>
          <Route path="/therapists">
            <Route path=":id/edit" element={<TherapistFormPage />} />
            <Route index element={<div data-testid="therapists-list" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </TherapistProvider>,
  );
}

// ── New therapist ────────────────────────────────────────────────────────────

describe("TherapistFormPage — new therapist", () => {
  it("renders an empty form with Add Therapist heading", async () => {
    renderNewForm();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /add therapist/i })).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("");
  });

  it("shows required field errors on empty submit", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /add therapist/i }));

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });
  });

  it("shows field error on blur without submitting", async () => {
    renderNewForm();
    await waitFor(() => screen.getByLabelText(/first name/i));

    fireEvent.blur(screen.getByLabelText(/first name/i));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });

  it("calls therapist:create and navigates to /therapists on success", async () => {
    const user = userEvent.setup();
    renderNewForm();

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:create") return Promise.resolve(wrapped(mockTherapist));
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Alice");
    await user.type(screen.getByLabelText(/last name/i), "Morgan");

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "therapist:create",
        expect.objectContaining({ first_name: "Alice", last_name: "Morgan" }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });

  it("creates therapist with is_admin checked", async () => {
    const user = userEvent.setup();
    renderNewForm();

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:create") return Promise.resolve(wrapped(mockTherapist));
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Alice");
    await user.type(screen.getByLabelText(/last name/i), "Morgan");
    await user.click(screen.getByLabelText(/is admin/i));

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "therapist:create",
        expect.objectContaining({ is_admin: true }),
      );
    });
  });

  it("shows generic error alert on save failure", async () => {
    const user = userEvent.setup();
    renderNewForm();

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:create") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Alice");
    await user.type(screen.getByLabelText(/last name/i), "Morgan");

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to save therapist/i);
    });
  });

  it("navigates to /therapists when Cancel is clicked", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });

  it("disables submit button while saving", async () => {
    const user = userEvent.setup();
    let resolveSave!: (v: typeof mockTherapist) => void;
    const savePromise = new Promise<typeof mockTherapist>((res) => { resolveSave = res; });

    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:create") return savePromise.then((data) => wrapped(data));
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Alice");
    await user.type(screen.getByLabelText(/last name/i), "Morgan");

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    resolveSave(mockTherapist);
  });
});

// ── Edit therapist ───────────────────────────────────────────────────────────

describe("TherapistFormPage — edit therapist", () => {
  it("renders Edit Therapist heading", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /edit therapist/i })).toBeInTheDocument();
    });
  });

  it("pre-populates form fields with existing therapist data", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("Alice");
      expect(screen.getByLabelText(/last name/i)).toHaveValue("Morgan");
      expect(screen.getByLabelText(/is admin/i)).toBeChecked();
    });
  });

  it("calls therapist:update and navigates to /therapists on success", async () => {
    const user = userEvent.setup();
    renderEditForm();

    await waitFor(() => screen.getByLabelText(/first name/i));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:get") return Promise.resolve(wrapped(mockTherapist));
      if (channel === "therapist:update") return Promise.resolve(wrapped(mockTherapist));
      return Promise.resolve(wrapped(null));
    });

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Alicia");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "therapist:update",
        expect.objectContaining({
          id: 1,
          data: expect.objectContaining({ first_name: "Alicia" }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });

  it("navigates to /therapists when therapist not found", async () => {
    localStorage.setItem("selectedTherapistId", "1");

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      if (channel === "therapist:get") return Promise.resolve(errorResponse.notFound);
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/therapists/99/edit"]}>
          <Routes>
            <Route path="/therapists">
              <Route path=":id/edit" element={<TherapistFormPage />} />
              <Route index element={<div data-testid="therapists-list" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });
});

// ── Non-admin access ─────────────────────────────────────────────────────────

describe("TherapistFormPage — non-admin", () => {
  it("redirects to /therapists with error message", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") return Promise.resolve(wrapped(mockTherapists));
      return Promise.resolve(wrapped(null));
    });

    render(
      <TherapistProvider>
        <MemoryRouter initialEntries={["/therapists/new"]}>
          <Routes>
            <Route path="/therapists">
              <Route path="new" element={<TherapistFormPage />} />
              <Route index element={<div data-testid="therapists-list" />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </TherapistProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });
});
