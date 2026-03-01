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

  return {
    form, setForm,
    saveError, setSaveError,
    formState, setFormState,
    clearError,
    markTouched,
    validate,
    getError,
  };
}
