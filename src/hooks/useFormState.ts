import { useState } from "react";
import { z } from "zod";

export type FormState = "idle" | "loading" | "saving" | "error";

export function useFormState<F extends Record<string, unknown>>(
  schema: z.ZodTypeAny,
  empty: F,
) {
  const [form, setForm] = useState<F>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof F, string>>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("idle");
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [originalForm, setOriginalForm] = useState<F | null>(null);
  const [conflicts, setConflicts] = useState<Partial<Record<string, string>>>({});

  function clearError(field: keyof F) {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function markTouched(field: string) {
    setTouched((prev) => new Set(prev).add(field));
    const result = schema.safeParse(form);
    const fieldKey = field as keyof F;
    if (result.success) {
      setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
    } else {
      const tree = z.treeifyError(result.error) as { properties?: Record<string, { errors?: string[] }> };
      const props = tree.properties;
      setErrors((prev) => ({
        ...prev,
        [fieldKey]: props?.[field]?.errors?.[0],
      }));
    }
  }

  function validate(): boolean {
    setTouched(new Set(Object.keys(empty)));
    const result = schema.safeParse(form);
    if (!result.success) {
      const tree = z.treeifyError(result.error) as { properties?: Record<string, { errors?: string[] }> };
      const props = tree.properties;
      const errs = Object.fromEntries(
        (Object.keys(empty) as (keyof F)[]).map((field) => [
          field,
          props?.[field as string]?.errors?.[0],
        ])
      ) as Partial<Record<keyof F, string>>;
      setErrors(errs);
      return false;
    }
    return true;
  }

  function getError(field: keyof F) {
    return touched.has(field as string) ? errors[field] : undefined;
  }

  function getConflictError(field: keyof F) {
    return conflicts[field as string];
  }

  function clearConflictField(field: keyof F) {
    setConflicts((prev) => {
      if (!(field as string in prev)) return prev;
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }

  async function handleConflict(getFreshData: () => Promise<{ form: F; updated_at: Date }>) {
    try {
      const fresh = await getFreshData();
      const serverChangedFields = (Object.keys(originalForm ?? {}) as (keyof F)[])
        .filter((field) => fresh.form[field] !== originalForm![field]);
      const userKeptFields = Object.fromEntries(
        (Object.keys(form) as (keyof F)[])
          .filter((field) => !serverChangedFields.includes(field))
          .map((field) => [field, form[field]]),
      );
      setForm({ ...fresh.form, ...userKeptFields } as F);
      setOriginalForm(fresh.form);
      setUpdatedAt(fresh.updated_at);
      if (serverChangedFields.length > 0) {
        setConflicts(Object.fromEntries(
          serverChangedFields.map((field) => [field, "Updated by someone else"]),
        ));
        setSaveError(
          `Someone else modified: ${serverChangedFields.join(", ")}. `
          + `Their changes were kept. Your other edits are preserved.`
        );
      } else {
        setSaveError("The record was updated. Please try saving again.");
      }
    } catch {
      setSaveError("A conflict occurred and the latest data could not be loaded.");
    }
  }

  return {
    form, setForm,
    originalForm, setOriginalForm,
    updatedAt, setUpdatedAt,
    formState, setFormState,
    saveError, setSaveError,
    validate,
    getError,
    clearError,
    markTouched,
    getConflictError,
    clearConflictField,
    handleConflict,
  };
}
