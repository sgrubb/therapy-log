import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MigrationPage from "@/pages/MigrationPage";
import { wrapped, errorResponse } from "../helpers/ipc-mocks";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <MigrationPage />
    </MemoryRouter>,
  );
}

describe("MigrationPage — loading/ready", () => {
  it("shows a loading state before migration info resolves", () => {
    let resolveInfo!: (v: unknown) => void;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return new Promise((res) => { resolveInfo = (v) => res(wrapped(v)); });
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    resolveInfo({ currentVersion: 5, requiredVersion: 9, createdByApp: true });
  });

  it("shows the Database Update Required screen with version numbers when ready", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /database update required/i })).toBeInTheDocument();
      expect(screen.getByText(/schema version 5/i)).toBeInTheDocument();
      expect(screen.getByText(/requires version 9/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /update database/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /quit/i })).toBeInTheDocument();
    });
  });

  it("shows a not-created-by-app warning when the database is foreign", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 3, requiredVersion: 9, createdByApp: false }));
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/not created by this app/i)).toBeInTheDocument();
    });
  });

  it("does not show the foreign-db warning when created by the app", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /database update required/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/not created by this app/i)).not.toBeInTheDocument();
  });
});

describe("MigrationPage — apply migration", () => {
  it("calls migration:apply and migration:complete on Update Database", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      if (channel === "migration:apply") return Promise.resolve(wrapped(null));
      if (channel === "migration:complete") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /update database/i }));
    fireEvent.click(screen.getByRole("button", { name: /update database/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("migration:apply");
      expect(mockInvoke).toHaveBeenCalledWith("migration:complete");
      expect(screen.getByText(/migration complete/i)).toBeInTheDocument();
    });
  });

  it("shows the Applying migration… loading text while migration is in flight", async () => {
    let resolveApply!: () => void;
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      if (channel === "migration:apply") return new Promise((res) => { resolveApply = () => res(wrapped(null)); });
      if (channel === "migration:complete") return Promise.resolve(wrapped(null));
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /update database/i }));
    fireEvent.click(screen.getByRole("button", { name: /update database/i }));

    await waitFor(() => {
      expect(screen.getByText(/applying migration/i)).toBeInTheDocument();
    });
    resolveApply();
  });

  it("shows the Migration Failed screen when migration:apply fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      if (channel === "migration:apply") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /update database/i }));
    fireEvent.click(screen.getByRole("button", { name: /update database/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /migration failed/i })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /quit/i })).toBeInTheDocument();
    });
  });
});

describe("MigrationPage — error states", () => {
  it("shows an error screen if migration:get-info fails on mount", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(errorResponse.unknown);
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /migration failed/i })).toBeInTheDocument();
    });
  });

  it("calls migration:quit when Quit is clicked from the error screen", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(errorResponse.unknown);
      if (channel === "migration:quit") return Promise.resolve(undefined);
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /quit/i }));
    fireEvent.click(screen.getByRole("button", { name: /quit/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("migration:quit");
    });
  });

  it("calls migration:quit when Quit is clicked from the ready screen", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "migration:get-info") return Promise.resolve(wrapped({ currentVersion: 5, requiredVersion: 9, createdByApp: true }));
      if (channel === "migration:quit") return Promise.resolve(undefined);
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /quit/i }));
    fireEvent.click(screen.getByRole("button", { name: /quit/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("migration:quit");
    });
  });
});
