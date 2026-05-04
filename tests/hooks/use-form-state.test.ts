import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { z } from "zod";
import { useFormState } from "@/hooks/use-form-state";
import { FormState } from "@/lib/types/enums";

const schema = z.object({
  name: z.string().min(1, "Name is required."),
  age: z.number().int().min(0, "Age must be 0 or greater."),
});

type Form = z.input<typeof schema>;

const empty: Form = { name: "", age: 0 };

describe("useFormState — initial state", () => {
  it("starts with the empty form", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.form).toEqual(empty);
  });

  it("starts in Idle form state", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.formState).toBe(FormState.Idle);
  });

  it("starts with no errors visible", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.getError("name")).toBeUndefined();
    expect(result.current.getError("age")).toBeUndefined();
  });

  it("starts with no save error", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.saveError).toBeNull();
  });

  it("starts with no conflicts", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.getConflictError("name")).toBeUndefined();
  });
});

describe("useFormState — setForm", () => {
  it("updates form state with a value", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.setForm({ name: "Alice", age: 30 }); });
    expect(result.current.form).toEqual({ name: "Alice", age: 30 });
  });

  it("supports an updater function", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.setForm((prev) => ({ ...prev, name: "Bob" })); });
    expect(result.current.form.name).toBe("Bob");
  });
});

describe("useFormState — validate", () => {
  it("returns true when the form is valid", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.setForm({ name: "Alice", age: 30 }); });
    let valid = false;
    act(() => { valid = result.current.validate(); });
    expect(valid).toBe(true);
  });

  it("returns false when the form is invalid", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    let valid = true;
    act(() => { valid = result.current.validate(); });
    expect(valid).toBe(false);
  });

  it("populates errors for invalid fields after calling validate", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.validate(); });
    expect(result.current.getError("name")).toBe("Name is required.");
  });

  it("marks all fields as touched so errors become visible", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    // Before validate: no errors visible because not touched
    expect(result.current.getError("name")).toBeUndefined();
    act(() => { result.current.validate(); });
    // After validate: errors visible
    expect(result.current.getError("name")).toBe("Name is required.");
  });
});

describe("useFormState — markTouched", () => {
  it("does not show errors before a field is touched", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    expect(result.current.getError("name")).toBeUndefined();
  });

  it("shows the field's error after it is touched and the value is invalid", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.markTouched("name"); });
    expect(result.current.getError("name")).toBe("Name is required.");
  });

  it("does not show an error after touching a valid field", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.setForm({ name: "Alice", age: 30 }); });
    act(() => { result.current.markTouched("name"); });
    expect(result.current.getError("name")).toBeUndefined();
  });

  it("only reveals the error for the touched field, not others", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.markTouched("name"); });
    expect(result.current.getError("name")).toBe("Name is required.");
    expect(result.current.getError("age")).toBeUndefined();
  });

  it("uses the latest form value (not a stale closure)", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    // Set valid value and immediately mark touched in the same render tick.
    act(() => {
      result.current.setForm({ name: "Alice", age: 30 });
      result.current.markTouched("name");
    });
    expect(result.current.getError("name")).toBeUndefined();
  });
});

describe("useFormState — clearError", () => {
  it("clears an existing error for a field", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.validate(); });
    expect(result.current.getError("name")).toBe("Name is required.");
    act(() => { result.current.clearError("name"); });
    expect(result.current.getError("name")).toBeUndefined();
  });

  it("is a no-op when there is no error to clear", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.clearError("name"); });
    expect(result.current.getError("name")).toBeUndefined();
  });
});

describe("useFormState — handleConflict", () => {
  it("flags fields the server changed and reports them in saveError", async () => {
    const { result } = renderHook(() => useFormState(schema, empty));

    // User loaded the form, edited the age, made it dirty.
    const original = { name: "Alice", age: 30 };
    act(() => {
      result.current.setForm({ name: "Alice", age: 31 });
      result.current.setOriginalForm(original);
    });

    // Server returns fresh data where the name changed under the user.
    const newUpdatedAt = new Date("2026-02-04T10:00:00");
    await act(async () => {
      await result.current.handleConflict(async () => ({
        form: { name: "Alicia", age: 30 },
        updated_at: newUpdatedAt,
      }));
    });

    expect(result.current.getConflictError("name")).toBe("Updated by someone else");
    expect(result.current.getConflictError("age")).toBeUndefined();
    expect(result.current.saveError).toMatch(/someone else modified: name/i);
    expect(result.current.updatedAt).toEqual(newUpdatedAt);
  });

  it("preserves user edits to fields the server did not change", async () => {
    const { result } = renderHook(() => useFormState(schema, empty));

    const original = { name: "Alice", age: 30 };
    act(() => {
      result.current.setForm({ name: "Alice", age: 31 }); // user edited age
      result.current.setOriginalForm(original);
    });

    await act(async () => {
      await result.current.handleConflict(async () => ({
        form: { name: "Alicia", age: 30 }, // server changed name
        updated_at: new Date(),
      }));
    });

    // Server name wins (the conflicting field), user's age edit preserved.
    expect(result.current.form).toEqual({ name: "Alicia", age: 31 });
  });

  it("shows a retry message when no fields changed on the server", async () => {
    const { result } = renderHook(() => useFormState(schema, empty));

    const original = { name: "Alice", age: 30 };
    act(() => {
      result.current.setForm({ name: "Alice", age: 31 });
      result.current.setOriginalForm(original);
    });

    await act(async () => {
      await result.current.handleConflict(async () => ({
        form: original,
        updated_at: new Date(),
      }));
    });

    expect(result.current.saveError).toMatch(/please try saving again/i);
    expect(result.current.getConflictError("name")).toBeUndefined();
  });

  it("shows a fallback message when fetching fresh data throws", async () => {
    const { result } = renderHook(() => useFormState(schema, empty));

    await act(async () => {
      await result.current.handleConflict(async () => {
        throw new Error("network down");
      });
    });

    expect(result.current.saveError).toMatch(/latest data could not be loaded/i);
  });
});

describe("useFormState — clearConflictField", () => {
  it("removes a conflict marker for a field", async () => {
    const { result } = renderHook(() => useFormState(schema, empty));

    const original = { name: "Alice", age: 30 };
    act(() => {
      result.current.setForm(original);
      result.current.setOriginalForm(original);
    });

    await act(async () => {
      await result.current.handleConflict(async () => ({
        form: { name: "Alicia", age: 30 },
        updated_at: new Date(),
      }));
    });

    expect(result.current.getConflictError("name")).toBe("Updated by someone else");
    act(() => { result.current.clearConflictField("name"); });
    expect(result.current.getConflictError("name")).toBeUndefined();
  });

  it("is a no-op for a field with no conflict", () => {
    const { result } = renderHook(() => useFormState(schema, empty));
    act(() => { result.current.clearConflictField("name"); });
    expect(result.current.getConflictError("name")).toBeUndefined();
  });
});
