import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "@/components/ErrorBoundary";
import { TherapistProvider } from "@/context/TherapistContext";
import TherapistFormPage from "@/pages/TherapistFormPage";
import { wrapped, mockTherapists, errorResponse, MOCK_UPDATED_AT } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

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
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/therapists/new"]}>
              <Routes>
                <Route path="/therapists">
                  <Route path="new" element={<TherapistFormPage />} />
                  <Route index element={<div data-testid="therapists-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

function renderEditForm() {
  localStorage.setItem("selectedTherapistId", "1"); // admin

  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "therapist:get") {
      return Promise.resolve(wrapped(mockTherapist));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/therapists/1/edit"]}>
              <Routes>
                <Route path="/therapists">
                  <Route path=":id/edit" element={<TherapistFormPage />} />
                  <Route index element={<div data-testid="therapists-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
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
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:create") {
        return Promise.resolve(wrapped(mockTherapist));
      }
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
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:create") {
        return Promise.resolve(wrapped(mockTherapist));
      }
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
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:create") {
        return Promise.resolve(errorResponse.unknown);
      }
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
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:create") {
        return savePromise.then((data) => wrapped(data));
      }
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

  it("clears field error when user types in that field", async () => {
    const user = userEvent.setup();
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /add therapist/i }));

    fireEvent.click(screen.getByRole("button", { name: /add therapist/i }));
    await waitFor(() => screen.getByText(/first name is required/i));

    await user.type(screen.getByLabelText(/first name/i), "A");

    await waitFor(() => {
      expect(screen.queryByText(/first name is required/i)).not.toBeInTheDocument();
    });
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
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return Promise.resolve(wrapped(mockTherapist));
      }
      if (channel === "therapist:update") {
        return Promise.resolve(wrapped(mockTherapist));
      }
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

  it("shows conflict warning with server-changed fields and preserves user edits", async () => {
    const user = userEvent.setup();
    localStorage.setItem("selectedTherapistId", "1");

    const freshTherapist = {
      ...mockTherapist,
      last_name: "Jones",
      updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000),
    };

    let therapistGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        therapistGetCount++;
        return Promise.resolve(wrapped(therapistGetCount === 1 ? mockTherapist : freshTherapist));
      }
      if (channel === "therapist:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient1 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient1}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/1/edit"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path=":id/edit" element={<TherapistFormPage />} />
                    <Route index element={<div data-testid="therapists-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("Alice");
    });

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Alicia");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/someone else modified/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/last_name/i);
    });

    // Server's last_name applied
    expect(screen.getByLabelText(/last name/i)).toHaveValue("Jones");
    // User's first_name edit preserved
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Alicia");
    // No navigation away
    expect(screen.queryByTestId("therapists-list")).not.toBeInTheDocument();
  });

  it("shows required field errors on empty submit", async () => {
    const user = userEvent.setup();
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.clear(screen.getByLabelText(/first name/i));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("therapist:update", expect.anything());
  });

  it("shows generic error alert on update failure", async () => {
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/first name/i));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return Promise.resolve(wrapped(mockTherapist));
      }
      if (channel === "therapist:update") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/failed to save therapist/i);
    });
  });

  it("navigates to /therapists when Cancel is clicked", async () => {
    renderEditForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching therapist data", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    let resolveTherapist!: (v: typeof mockTherapist) => void;
    const therapistPromise = new Promise<typeof mockTherapist>((res) => {
      resolveTherapist = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return therapistPromise.then((data) => wrapped(data));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient2 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient2}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/1/edit"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path=":id/edit" element={<TherapistFormPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveTherapist(mockTherapist);
    await waitFor(() => screen.getByLabelText(/first name/i));
  });

  it("shows error boundary when therapist fetch throws", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient3 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient3}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/1/edit"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path=":id/edit" element={<TherapistFormPage />} />
                    <Route index element={<div data-testid="therapists-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    spy.mockRestore();
  });

  it("shows retry message when conflict has no field differences", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const freshTherapist = { ...mockTherapist, updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000) };

    let therapistGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        therapistGetCount++;
        return Promise.resolve(wrapped(therapistGetCount === 1 ? mockTherapist : freshTherapist));
      }
      if (channel === "therapist:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient4 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient4}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/1/edit"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path=":id/edit" element={<TherapistFormPage />} />
                    <Route index element={<div data-testid="therapists-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByLabelText(/first name/i));

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/please try saving again/i);
    });
  });

  it("shows error boundary when therapist not found", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "therapist:get") {
        return Promise.resolve(errorResponse.notFound);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient5 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient5}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/99/edit"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path=":id/edit" element={<TherapistFormPage />} />
                    <Route index element={<div data-testid="therapists-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
    spy.mockRestore();
  });
});

// ── Non-admin access ─────────────────────────────────────────────────────────

describe("TherapistFormPage — non-admin", () => {
  it("redirects to /therapists with error message", async () => {
    localStorage.setItem("selectedTherapistId", "2"); // Bob Chen, is_admin: false

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient6 = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient6}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/therapists/new"]}>
                <Routes>
                  <Route path="/therapists">
                    <Route path="new" element={<TherapistFormPage />} />
                    <Route index element={<div data-testid="therapists-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("therapists-list")).toBeInTheDocument();
    });
  });
});
