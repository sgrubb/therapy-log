import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React, { Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { TherapistProvider, useTherapists } from "@/context/TherapistContext";
import { wrapped, wrappedPaginated, mockTherapists } from "../helpers/ipc-mocks";
import { createTestQueryClient } from "../helpers/query-client";

const mockInvoke = vi.fn();

beforeEach(() => {
  mockInvoke.mockReset();
  window.electronAPI = { invoke: mockInvoke } as never;
  mockInvoke.mockImplementation((channel: string) => {
    if (channel === "therapist:list") { return Promise.resolve(wrappedPaginated(mockTherapists)); }
    return Promise.resolve(wrapped(null));
  });
});

function renderTherapistsHook() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div>Loading...</div>}>
          <TherapistProvider>{children}</TherapistProvider>
        </Suspense>
      </QueryClientProvider>
    );
  }
  return renderHook(() => useTherapists(), { wrapper: Wrapper });
}

describe("TherapistProvider", () => {
  it("provides therapists from the paginated list", async () => {
    const { result } = renderTherapistsHook();
    await waitFor(() => {
      expect(result.current.therapists).toHaveLength(2);
      expect(result.current.therapists.map((t) => t.first_name)).toContain("Alice");
      expect(result.current.therapists.map((t) => t.first_name)).toContain("Bob");
    });
  });

  it("exposes totalTherapists and pageSize from the paginated response", async () => {
    const { result } = renderTherapistsHook();
    await waitFor(() => expect(result.current.therapists.length).toBeGreaterThan(0));

    expect(result.current.totalTherapists).toBe(2);
    expect(result.current.pageSize).toBeGreaterThan(0);
  });

  it("starts on page 1", async () => {
    const { result } = renderTherapistsHook();
    await waitFor(() => expect(result.current.therapists.length).toBeGreaterThan(0));

    expect(result.current.page).toBe(1);
  });

  it("exposes empty list when no therapists exist", async () => {
    mockInvoke.mockImplementation((channel: string) => {
      if (channel === "therapist:list") { return Promise.resolve(wrappedPaginated([])); }
      return Promise.resolve(wrapped(null));
    });

    const { result } = renderTherapistsHook();
    await waitFor(() => {
      expect(result.current.therapists).toHaveLength(0);
      expect(result.current.totalTherapists).toBe(0);
    });
  });
});

describe("useTherapists", () => {
  it("throws when used outside TherapistProvider", () => {
    expect(() => {
      renderHook(() => useTherapists());
    }).toThrow("useTherapists must be used within a TherapistProvider");
  });
});
