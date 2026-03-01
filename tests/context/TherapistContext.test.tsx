import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { TherapistProvider, useTherapist } from "@/context/TherapistContext";
import { wrapped, mockTherapists } from "../helpers/test-helpers";

const mockInvoke = vi.fn();

beforeEach(() => {
  localStorage.clear();
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(wrapped(mockTherapists));
  window.electronAPI = { invoke: mockInvoke } as never;
});

function renderTherapistHook() {
  return renderHook(() => useTherapist(), {
    wrapper: TherapistProvider,
  });
}

describe("TherapistProvider", () => {
  it("fetches therapist list via IPC on mount", async () => {
    renderTherapistHook();
    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("therapist:list");
    });
  });

  it("provides fetched therapists in context", async () => {
    const { result } = renderTherapistHook();
    await waitFor(() => {
      expect(result.current.therapists).toEqual(mockTherapists);
    });
  });

  it("defaults selectedTherapistId to null when localStorage is empty", () => {
    const { result } = renderTherapistHook();
    expect(result.current.selectedTherapistId).toBeNull();
  });

  it("restores selectedTherapistId from localStorage on mount", () => {
    localStorage.setItem("selectedTherapistId", "2");
    const { result } = renderTherapistHook();
    expect(result.current.selectedTherapistId).toBe(2);
  });

  it("persists selectedTherapistId to localStorage when changed", async () => {
    const { result } = renderTherapistHook();

    act(() => {
      result.current.setSelectedTherapistId(1);
    });

    expect(result.current.selectedTherapistId).toBe(1);
    expect(localStorage.getItem("selectedTherapistId")).toBe("1");
  });

  it("removes from localStorage when set to null", async () => {
    localStorage.setItem("selectedTherapistId", "1");
    const { result } = renderTherapistHook();

    act(() => {
      result.current.setSelectedTherapistId(null);
    });

    expect(result.current.selectedTherapistId).toBeNull();
    expect(localStorage.getItem("selectedTherapistId")).toBeNull();
  });
});

describe("useTherapist", () => {
  it("throws when used outside TherapistProvider", () => {
    expect(() => {
      renderHook(() => useTherapist());
    }).toThrow("useTherapist must be used within a TherapistProvider");
  });
});
