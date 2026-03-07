import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc, IpcError } from "@/lib/ipc";
import log from "@/lib/logger";
import { therapistFormSchema } from "@/schemas/forms";
import { useFormState } from "@/hooks/useFormState";
import { useTherapist } from "@/context/TherapistContext";
import type { Therapist } from "@/types/ipc";

export type FormFields = z.input<typeof therapistFormSchema>;

const EMPTY: FormFields = {
  first_name: "",
  last_name: "",
  is_admin: false,
};

function mapTherapistToFormFields(therapist: Therapist): FormFields {
  return {
    first_name: therapist.first_name,
    last_name: therapist.last_name,
    is_admin: therapist.is_admin,
  };
}

function buildPayload(form: FormFields) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    is_admin: form.is_admin,
  };
}

export type ConflictWarning = { fields: string[]; message: string };

export function useTherapistForm(therapistId?: number) {
  const navigate = useNavigate();
  const { refreshTherapists } = useTherapist();
  const isEdit = therapistId !== undefined;

  const {
    form, setForm,
    saveError, setSaveError,
    formState, setFormState,
    clearError,
    markTouched,
    validate,
    getError,
  } = useFormState(therapistFormSchema, EMPTY);

  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [originalForm, setOriginalForm] = useState<FormFields | null>(null);
  const [conflictWarning, setConflictWarning] = useState<ConflictWarning | null>(null);

  useEffect(() => {
    if (!isEdit || therapistId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const therapist = await ipc.getTherapist(therapistId!);
        const fields = mapTherapistToFormFields(therapist);
        setForm(fields);
        setOriginalForm(fields);
        setUpdatedAt(therapist.updated_at);
      } catch (err) {
        log.error("Failed to load therapist:", err);
        navigate("/therapists");
      } finally {
        setFormState("idle");
      }
    }
    load();
  }, [therapistId, isEdit, navigate]);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
    if (conflictWarning?.fields.includes(field as string)) {
      setConflictWarning(null);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && therapistId !== undefined) {
        await ipc.updateTherapist(therapistId, { ...payload, updated_at: updatedAt! });
      } else {
        await ipc.createTherapist(payload);
      }
      await refreshTherapists();
      navigate("/therapists");
    } catch (err) {
      if (err instanceof IpcError && err.code === "CONFLICT" && therapistId !== undefined) {
        try {
          const fresh = await ipc.getTherapist(therapistId);
          const freshForm = mapTherapistToFormFields(fresh);
          const serverChangedFields = (Object.keys(originalForm ?? {}) as (keyof FormFields)[]).filter(
            (field) => freshForm[field] !== originalForm![field],
          );
          const userKeptFields = Object.fromEntries(
            (Object.keys(form) as (keyof FormFields)[])
              .filter((field) => !serverChangedFields.includes(field))
              .map((field) => [field, form[field]]),
          );
          setForm({ ...freshForm, ...userKeptFields } as FormFields);
          setOriginalForm(freshForm);
          setUpdatedAt(fresh.updated_at);
          if (serverChangedFields.length > 0) {
            setConflictWarning({
              fields: serverChangedFields as string[],
              message: `Someone else modified: ${serverChangedFields.join(", ")}. Their changes were kept. Your other edits are preserved.`,
            });
          } else {
            setSaveError("The record was updated. Please try saving again.");
          }
        } catch {
          setSaveError("A conflict occurred and the latest data could not be loaded.");
        }
      } else {
        log.error("Failed to save therapist:", err);
        setSaveError("Failed to save therapist. Please try again.");
      }
      setFormState("error");
    }
  }

  return {
    form,
    formState,
    saveError,
    conflictWarning,
    isEdit,
    set,
    handleSubmit,
    markTouched,
    getError,
  };
}
