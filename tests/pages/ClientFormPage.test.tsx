import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { TherapistProvider } from "@/context/TherapistContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import ClientFormPage from "@/pages/ClientFormPage";
import { wrapped, mockTherapists, mockClient, errorResponse, MOCK_UPDATED_AT } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

vi.mock("@/components/ui/select");
vi.mock("@/components/ui/searchable-select");

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderNewForm() {
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
            <MemoryRouter initialEntries={["/clients/new"]}>
              <Routes>
                <Route path="/clients">
                  <Route path="new" element={<ClientFormPage />} />
                  <Route path=":id" element={<div data-testid="client-detail" />} />
                  <Route index element={<div data-testid="clients-list" />} />
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
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") {
      return Promise.resolve(wrapped(mockTherapists));
    }
    if (channel === "client:get") {
      return Promise.resolve(wrapped(mockClient));
    }
    return Promise.resolve(wrapped(null));
  });

  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>
            <MemoryRouter initialEntries={["/clients/1/edit"]}>
              <Routes>
                <Route path="/clients">
                  <Route path=":id/edit" element={<ClientFormPage />} />
                  <Route path=":id" element={<div data-testid="client-detail" />} />
                  <Route index element={<div data-testid="clients-list" />} />
                </Route>
              </Routes>
            </MemoryRouter>
          </TherapistProvider>
        </Suspense>
      </ErrorBoundary>
    </QueryClientProvider>,
  );
}

// The mocked Select renders native <select> elements in this order:
// 0 = session_day, 1 = session_delivery_method, 2 = therapist_id, 3 = outcome (only when closed)
function getTherapistSelect() {
  return screen.getAllByRole("combobox")[2]!;
}
function getSessionDeliveryMethodSelect() {
  return screen.getAllByRole("combobox")[1]!;
}

// ── New client ────────────────────────────────────────────────────────

describe("ClientFormPage — new client", () => {
  it("renders an empty form with Add Client heading", async () => {
    renderNewForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /add client/i }),
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/first name/i)).toHaveValue("");
    expect(screen.getByLabelText(/last name/i)).toHaveValue("");
    expect(screen.getByLabelText(/hospital number/i)).toHaveValue("");
  });

  it("shows required field errors on empty submit", async () => {
    renderNewForm();
    await waitFor(() =>
      screen.getByRole("button", { name: /add client/i }),
    );

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/first name is required/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
      expect(
        screen.getByText(/hospital number is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/date of birth is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/therapist is required/i),
      ).toBeInTheDocument();
    });
  });

  it("shows contact error when neither phone nor email is provided", async () => {
    const user = userEvent.setup();
    renderNewForm();

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/at least one of phone or email/i).length,
      ).toBeGreaterThan(0);
    });
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "client:create",
      expect.anything(),
    );
  });

  it("shows error when notes exceed 1000 characters", async () => {
    const user = userEvent.setup();
    renderNewForm();
    await waitFor(() => screen.getByLabelText(/notes/i));

    await user.type(screen.getByLabelText(/notes/i), "a".repeat(1001));

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/1000 characters or fewer/i),
      ).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "client:create",
      expect.anything(),
    );
  });

  it("calls client:create with correct payload and navigates to detail", async () => {
    const user = userEvent.setup();
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return Promise.resolve(wrapped(mockClient));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/phone/i), "07700900123");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:create",
        expect.objectContaining({
          first_name: "Jane",
          last_name: "Smith",
          hospital_number: "HN999",
          therapist_id: 1,
          phone: "07700900123",
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("client-detail")).toBeInTheDocument();
    });
  });

  it("shows error alert on duplicate hospital number", async () => {
    const user = userEvent.setup();

    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return Promise.resolve(errorResponse.uniqueConstraint);
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN001");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/phone/i), "07700900123");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /hospital number already exists/i,
      );
    });
  });

  it("navigates to /clients when Cancel is clicked", async () => {
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
  });

  it("Cancel navigates to location.state.from when coming from detail page", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter
                initialEntries={[{ pathname: "/clients/new", state: { from: "/clients/1" } }]}
              >
                <Routes>
                  <Route path="/clients">
                    <Route path="new" element={<ClientFormPage />} />
                    <Route path=":id" element={<div data-testid="client-detail" />} />
                    <Route index element={<div data-testid="clients-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("client-detail")).toBeInTheDocument();
    });
  });

  it("shows generic error alert on non-duplicate save failure", async () => {
    const user = userEvent.setup();
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/phone/i), "07700900123");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to save client/i,
      );
    });
  });

  it("submits successfully with email only (no phone)", async () => {
    const user = userEvent.setup();
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return Promise.resolve(wrapped(mockClient));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/email/i), "jane@example.com");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:create",
        expect.objectContaining({ email: "jane@example.com" }),
      );
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

  it("clears field error when user types in that field", async () => {
    const user = userEvent.setup();
    renderNewForm();
    await waitFor(() => screen.getByRole("button", { name: /add client/i }));

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));
    await waitFor(() => screen.getByText(/first name is required/i));

    await user.type(screen.getByLabelText(/first name/i), "J");

    await waitFor(() => {
      expect(
        screen.queryByText(/first name is required/i),
      ).not.toBeInTheDocument();
    });
  });

  it("disables submit button while saving", async () => {
    const user = userEvent.setup();
    let resolveSave!: (v: typeof mockClient) => void;
    const savePromise = new Promise<typeof mockClient>((res) => {
      resolveSave = res;
    });

    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return savePromise.then((data) => wrapped(data));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/phone/i), "07700900123");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();
    });

    resolveSave(mockClient);
  });
});

// ── Edit client ───────────────────────────────────────────────────────

describe("ClientFormPage — edit client", () => {
  it("pre-populates form fields with existing client data", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
      expect(screen.getByLabelText(/last name/i)).toHaveValue("Smith");
      expect(screen.getByLabelText(/hospital number/i)).toHaveValue("HN001");
      expect(screen.getByLabelText(/phone/i)).toHaveValue("07700900001");
    });
  });

  it("calls client:update and navigates to detail on valid submit", async () => {
    const user = userEvent.setup();

    renderEditForm();
    await waitFor(() => screen.getByLabelText(/first name/i));

    // Override mock after initial load so client:update is handled correctly
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "client:update") {
        return Promise.resolve(wrapped(mockClient));
      }
      return Promise.resolve(wrapped(null));
    });

    const firstNameInput = screen.getByLabelText(/first name/i);
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Janet");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:update",
        expect.objectContaining({
          id: 1,
          data: expect.objectContaining({ first_name: "Janet" }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId("client-detail")).toBeInTheDocument();
    });
  });

  it("renders Edit Client heading", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit client/i }),
      ).toBeInTheDocument();
    });
  });

  it("navigates to /clients when Cancel is clicked", async () => {
    renderEditForm();
    await waitFor(() => screen.getByRole("button", { name: /cancel/i }));

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("clients-list")).toBeInTheDocument();
    });
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
    expect(mockInvoke).not.toHaveBeenCalledWith(
      "client:update",
      expect.anything(),
    );
  });

  it("shows generic error alert on update failure", async () => {
    renderEditForm();
    await waitFor(() => screen.getByLabelText(/first name/i));

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(wrapped(mockClient));
      }
      if (channel === "client:update") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to save client/i,
      );
    });
  });

  it("shows error boundary when client is not found", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.resolve(errorResponse.notFound);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/clients/1/edit"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id/edit" element={<ClientFormPage />} />
                    <Route index element={<div data-testid="clients-list" />} />
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

  it("shows error boundary when client fetch throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return Promise.reject(new Error("Network error"));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/clients/1/edit"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id/edit" element={<ClientFormPage />} />
                    <Route index element={<div data-testid="clients-list" />} />
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

  it("shows loading state while fetching client data", async () => {
    let resolveClient!: (v: typeof mockClient) => void;
    const clientPromise = new Promise<typeof mockClient>((res) => {
      resolveClient = res;
    });

    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        return clientPromise.then((data) => wrapped(data));
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/clients/1/edit"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id/edit" element={<ClientFormPage />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    resolveClient(mockClient);
    await waitFor(() => screen.getByLabelText(/first name/i));
  });

  it("pre-populates address, date of birth and session time", async () => {
    renderEditForm();
    await waitFor(() => {
      expect(screen.getByLabelText(/address/i)).toHaveValue("123 Main St");
      // dob converted via toISOString().split("T")[0] → "2000-01-15"
      expect(screen.getByLabelText(/date of birth/i)).toHaveValue("2000-01-15");
      expect(screen.getByLabelText(/session time/i)).toHaveValue("10:00");
    });
  });

  it("pre-populates session duration and delivery method", async () => {
    renderEditForm();
    await waitFor(() => {
      // mockClient.session_duration = 60 → "01:00"
      expect(screen.getByLabelText(/session duration/i)).toHaveValue("01:00");
      expect(getSessionDeliveryMethodSelect()).toHaveValue("FaceToFace");
    });
  });

  it("sends session_duration as minutes in payload when set", async () => {
    const user = userEvent.setup();
    renderNewForm();
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:create") {
        return Promise.resolve(wrapped(mockClient));
      }
      return Promise.resolve(wrapped(null));
    });

    await waitFor(() => screen.getByLabelText(/first name/i));

    await user.type(screen.getByLabelText(/first name/i), "Jane");
    await user.type(screen.getByLabelText(/last name/i), "Smith");
    await user.type(screen.getByLabelText(/hospital number/i), "HN999");
    await user.type(screen.getByLabelText(/date of birth/i), "2000-01-01");
    await user.type(screen.getByLabelText(/phone/i), "07700900123");
    fireEvent.change(getTherapistSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/session duration/i), { target: { value: "01:30" } });

    fireEvent.click(screen.getByRole("button", { name: /add client/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "client:create",
        expect.objectContaining({ session_duration: 90 }),
      );
    });
  });

  it("shows conflict warning with server-changed fields and preserves user edits", async () => {
    const user = userEvent.setup();

    const freshClient = {
      ...mockClient,
      first_name: "Janet",
      updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000),
    };

    let clientGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        clientGetCount++;
        return Promise.resolve(wrapped(clientGetCount === 1 ? mockClient : freshClient));
      }
      if (channel === "client:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/clients/1/edit"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id/edit" element={<ClientFormPage />} />
                    <Route path=":id" element={<div data-testid="client-detail" />} />
                    <Route index element={<div data-testid="clients-list" />} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </TherapistProvider>
          </Suspense>
        </ErrorBoundary>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/first name/i)).toHaveValue("Jane");
    });

    await user.type(screen.getByLabelText(/notes/i), "My note");

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/someone else modified/i);
      expect(screen.getByRole("alert")).toHaveTextContent(/first_name/i);
    });

    // Server's value for first_name is applied
    expect(screen.getByLabelText(/first name/i)).toHaveValue("Janet");
    // User's notes edit is preserved
    expect(screen.getByLabelText(/notes/i)).toHaveValue("My note");
    // Page does not navigate away
    expect(screen.queryByTestId("client-detail")).not.toBeInTheDocument();
  });

  it("shows retry message when conflict has no field differences", async () => {
    const freshClient = { ...mockClient, updated_at: new Date(MOCK_UPDATED_AT.getTime() + 1000) };

    let clientGetCount = 0;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") {
        return Promise.resolve(wrapped(mockTherapists));
      }
      if (channel === "client:get") {
        clientGetCount++;
        return Promise.resolve(wrapped(clientGetCount === 1 ? mockClient : freshClient));
      }
      if (channel === "client:update") {
        return Promise.resolve(errorResponse.conflict);
      }
      return Promise.resolve(wrapped(null));
    });

    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Suspense fallback={<div>Loading...</div>}>
            <TherapistProvider>
              <MemoryRouter initialEntries={["/clients/1/edit"]}>
                <Routes>
                  <Route path="/clients">
                    <Route path=":id/edit" element={<ClientFormPage />} />
                    <Route path=":id" element={<div data-testid="client-detail" />} />
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
});
