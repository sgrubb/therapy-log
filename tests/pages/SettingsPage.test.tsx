import { Suspense } from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import SettingsPage from "@/pages/SettingsPage";
import { wrapped, errorResponse } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderPage() {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <MemoryRouter>
          <SettingsPage />
        </MemoryRouter>
      </Suspense>
    </QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  it("renders the current database path", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped("/data/therapy.db"));
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/\/data\/therapy\.db/)).toBeInTheDocument();
    });
  });

  it("shows 'Not configured' when path is null", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped(null));
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Not configured/)).toBeInTheDocument();
    });
  });

  it("clicking 'Change Database Location' opens the file dialog", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped("/data/therapy.db"));
      }
      if (channel === "settings:open-file-dialog") {
        return Promise.resolve(wrapped(null));
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await screen.findByText(/Change Database Location/);

    await userEvent.click(screen.getByRole("button", { name: /Change Database Location/i }));

    expect(mockInvoke).toHaveBeenCalledWith("settings:open-file-dialog");
  });

  it("shows restart warning after a successful path change", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped("/old/path.db"));
      }
      if (channel === "settings:open-file-dialog") {
        return Promise.resolve(wrapped("/new/path.db"));
      }
      if (channel === "settings:set-db-path") {
        return Promise.resolve(wrapped(null));
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await screen.findByText(/Change Database Location/);

    await userEvent.click(screen.getByRole("button", { name: /Change Database Location/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/Restart the app/);
    });
  });

  it("does not show restart warning when dialog is cancelled", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped("/data/therapy.db"));
      }
      if (channel === "settings:open-file-dialog") {
        return Promise.resolve(wrapped(null));
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await screen.findByText(/Change Database Location/);

    await userEvent.click(screen.getByRole("button", { name: /Change Database Location/i }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  it("shows error message when set-db-path fails", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "settings:get-db-path") {
        return Promise.resolve(wrapped("/data/therapy.db"));
      }
      if (channel === "settings:open-file-dialog") {
        return Promise.resolve(wrapped("/new/path.db"));
      }
      if (channel === "settings:set-db-path") {
        return Promise.resolve(errorResponse.unknown);
      }
      return Promise.resolve(wrapped(null));
    });

    renderPage();
    await screen.findByText(/Change Database Location/);

    await userEvent.click(screen.getByRole("button", { name: /Change Database Location/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/unexpected error/i);
    });
  });
});
