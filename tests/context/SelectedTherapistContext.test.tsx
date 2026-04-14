import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { SelectedTherapistProvider, useSelectedTherapist } from "@/context/SelectedTherapistContext";
import { wrapped, mockTherapists } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(wrapped(mockTherapists));
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderSelectedTherapistHook() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <SelectedTherapistProvider>{children}</SelectedTherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useSelectedTherapist(), { wrapper: Wrapper });
}

describe("SelectedTherapistProvider", () => {
  it("fetches therapist list via IPC on mount", async () => {
    renderSelectedTherapistHook();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("therapist:list-all");
    });
  });

  it("provides fetched therapists in context", async () => {
    const { result } = renderSelectedTherapistHook();
    await waitFor(() => {
      expect(result.current.therapists).toEqual(mockTherapists);
    });
  });

  it("defaults selectedTherapistId to null when localStorage is empty", async () => {
    const { result } = renderSelectedTherapistHook();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.selectedTherapistId).toBeNull();
  });

  it("restores selectedTherapistId from localStorage on mount", async () => {
    localStorage.setItem("selectedTherapistId", "2");
    const { result } = renderSelectedTherapistHook();
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.selectedTherapistId).toBe(2);
  });

  it("persists selectedTherapistId to localStorage when changed", async () => {
    const { result } = renderSelectedTherapistHook();
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => {
      result.current.setSelectedTherapistId(1);
    });

    expect(result.current.selectedTherapistId).toBe(1);
    expect(localStorage.getItem("selectedTherapistId")).toBe("1");
  });

  it("removes from localStorage when set to null", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderSelectedTherapistHook();
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => {
      result.current.setSelectedTherapistId(null);
    });

    expect(result.current.selectedTherapistId).toBeNull();
    expect(localStorage.getItem("selectedTherapistId")).toBeNull();
  });
});

describe("useSelectedTherapist", () => {
  it("throws when used outside SelectedTherapistProvider", () => {
    expect(() => {
      renderHook(() => useSelectedTherapist());
    }).toThrow("useSelectedTherapist must be used within a SelectedTherapistProvider");
  });
});
