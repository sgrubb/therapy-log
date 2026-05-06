import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import SetupPage from "@/pages/SetupPage";
import { wrapped, errorResponse } from "../helpers/ipc-mocks";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderSetup(initialEntry = "/setup") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SetupPage — idle/welcome", () => {
  it("renders welcome heading and the two database options", () => {
    renderSetup();
    expect(screen.getByRole("heading", { name: /welcome to therapy log/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create new database/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select database file/i })).toBeInTheDocument();
  });

  it("renders a recovery error from the URL when present", () => {
    renderSetup("/setup?error=Database+file+missing");
    expect(screen.getByRole("alert")).toHaveTextContent(/database file missing/i);
  });

  it("does not render an alert when no recovery error is in the URL", () => {
    renderSetup();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("SetupPage — create new database", () => {
  it("creates the database and shows the Create Your Account form", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /first name/i })).toBeInTheDocument();
      expect(screen.getByRole("textbox", { name: /last name/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });
  });

  it("shows field validation errors when name fields are empty", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));
    await waitFor(() => screen.getByRole("button", { name: /create account/i }));
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    });
    expect(mockInvoke).not.toHaveBeenCalledWith("setup:create-first-therapist", expect.anything());
  });

  it("shows an error screen when therapist creation fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(wrapped(null));
      if (channel === "setup:create-first-therapist") {
        return Promise.resolve({ success: false, error: { code: "UNKNOWN", message: "disk error" } });
      }
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));
    await waitFor(() => screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /first name/i }), { target: { value: "Alice" } });
    fireEvent.change(screen.getByRole("textbox", { name: /last name/i }), { target: { value: "Smith" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    });
  });

  it("returns to the welcome screen if the user cancels the save dialog", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));

    // No "Database Created" screen, returns to idle.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to therapy log/i })).toBeInTheDocument();
    });
  });

  it("shows an error screen when database creation fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });
  });
});

describe("SetupPage — use existing database", () => {
  it("validates a compatible database and shows the Database Ready screen", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped("/tmp/existing.db"));
      if (channel === "setup:validate-existing-database") {
        return Promise.resolve(wrapped({ valid: true, version: 9 }));
      }
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /database ready/i })).toBeInTheDocument();
      expect(screen.getByText("/tmp/existing.db")).toBeInTheDocument();
    });
  });

  it("shows a version-mismatch screen when the database is older", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped("/tmp/old.db"));
      if (channel === "setup:validate-existing-database") {
        return Promise.resolve(wrapped({ valid: false, version: 3 }));
      }
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /database needs updating/i })).toBeInTheDocument();
      expect(screen.getByText(/schema version 3/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /go back/i })).toBeInTheDocument();
    });
  });

  it("the Go Back button on version-mismatch returns to the welcome screen", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped("/tmp/old.db"));
      if (channel === "setup:validate-existing-database") {
        return Promise.resolve(wrapped({ valid: false, version: 3 }));
      }
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));
    await waitFor(() => screen.getByRole("button", { name: /go back/i }));
    fireEvent.click(screen.getByRole("button", { name: /go back/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to therapy log/i })).toBeInTheDocument();
    });
  });

  it("returns to the welcome screen if the user cancels the file dialog", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to therapy log/i })).toBeInTheDocument();
    });
  });

  it("shows an error screen with a meaningful message when the database is incompatible", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped("/tmp/bad.db"));
      if (channel === "setup:validate-existing-database") return Promise.resolve(errorResponse.validation);
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/incompatible or corrupted/i);
    });
  });
});

describe("SetupPage — Continue from created/validated screens", () => {
  it("creates therapist then calls setup:save-config and setup:complete with createdByApp=true", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(wrapped(null));
      if (channel === "setup:create-first-therapist") return Promise.resolve(wrapped(null));
      if (channel === "setup:save-config") return Promise.resolve(wrapped(null));
      if (channel === "setup:complete") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));
    await waitFor(() => screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /first name/i }), { target: { value: "Alice" } });
    fireEvent.change(screen.getByRole("textbox", { name: /last name/i }), { target: { value: "Smith" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "setup:create-first-therapist",
        expect.objectContaining({ firstName: "Alice", lastName: "Smith" }),
      );
      expect(mockInvoke).toHaveBeenCalledWith(
        "setup:save-config",
        { dbPath: "/tmp/new.db", createdByApp: true },
      );
      expect(mockInvoke).toHaveBeenCalledWith("setup:complete");
    });
  });

  it("calls setup:save-config with createdByApp=false after using existing", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-file-dialog") return Promise.resolve(wrapped("/tmp/existing.db"));
      if (channel === "setup:validate-existing-database") {
        return Promise.resolve(wrapped({ valid: true, version: 9 }));
      }
      if (channel === "setup:save-config") return Promise.resolve(wrapped(null));
      if (channel === "setup:complete") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /select database file/i }));
    await waitFor(() => screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith(
        "setup:save-config",
        { dbPath: "/tmp/existing.db", createdByApp: false },
      );
    });
  });

  it("shows error screen when setup:save-config fails after therapist creation", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(wrapped(null));
      if (channel === "setup:create-first-therapist") return Promise.resolve(wrapped(null));
      if (channel === "setup:save-config") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));
    await waitFor(() => screen.getByRole("button", { name: /create account/i }));
    fireEvent.change(screen.getByRole("textbox", { name: /first name/i }), { target: { value: "Alice" } });
    fireEvent.change(screen.getByRole("textbox", { name: /last name/i }), { target: { value: "Smith" } });
    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /something went wrong/i })).toBeInTheDocument();
    });
  });
});

describe("SetupPage — error recovery", () => {
  it("Try Again returns to the welcome screen from an error", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "setup:open-save-dialog") return Promise.resolve(wrapped("/tmp/new.db"));
      if (channel === "setup:create-database") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    renderSetup();
    fireEvent.click(screen.getByRole("button", { name: /create new database/i }));
    await waitFor(() => screen.getByRole("button", { name: /try again/i }));
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /welcome to therapy log/i })).toBeInTheDocument();
    });
  });
});
