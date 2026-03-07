import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc, IpcError } from "@/lib/ipc";
import log from "@/lib/logger";
import { clientFormSchema } from "@/schemas/forms";
import { SessionDay, Outcome } from "@/types/enums";
import { useFormState } from "@/hooks/useFormState";
import type { ClientWithTherapist } from "@/types/ipc";

// Field names mirror the database schema (snake_case) so they map directly
// onto IPC payloads without a translation step.
export type FormFields = z.input<typeof clientFormSchema>;

const EMPTY: FormFields = {
  first_name: "",
  last_name: "",
  hospital_number: "",
  dob: "",
  address: "",
  phone: "",
  email: "",
  session_day: "",
  session_time: "",
  therapist_id: "",
  pre_score: "",
  post_score: "",
  outcome: "",
  notes: "",
};

function mapClientToFormFields(client: ClientWithTherapist): FormFields {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    hospital_number: client.hospital_number,
    dob: client.dob.toISOString().split("T")[0] ?? "",
    address: client.address ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    session_day: client.session_day ?? "",
    session_time: client.session_time ?? "",
    therapist_id: client.therapist_id.toString(),
    pre_score: client.pre_score?.toString() ?? "",
    post_score: client.post_score?.toString() ?? "",
    outcome: client.outcome ?? "",
    notes: client.notes ?? "",
  };
}

function buildPayload(form: FormFields) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    hospital_number: form.hospital_number.trim(),
    dob: new Date(form.dob),
    address: (form.address ?? "").trim() || undefined,
    phone: (form.phone ?? "").trim() || undefined,
    email: (form.email ?? "").trim() || undefined,
    session_day: (form.session_day || undefined) as SessionDay | undefined,
    session_time: form.session_time || undefined,
    therapist_id: Number(form.therapist_id),
    pre_score: form.pre_score !== "" ? Number(form.pre_score) : undefined,
    post_score: form.post_score !== "" ? Number(form.post_score) : undefined,
    outcome: (form.outcome || undefined) as Outcome | undefined,
    notes: (form.notes ?? "").trim() || undefined,
  };
}

export type ConflictWarning = { fields: string[]; message: string };

export function useClientForm(clientId?: number) {
  const navigate = useNavigate();
  const isEdit = clientId !== undefined;

  const {
    form, setForm,
    saveError, setSaveError,
    formState, setFormState,
    clearError,
    markTouched,
    validate,
    getError,
  } = useFormState(clientFormSchema, EMPTY);

  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [originalForm, setOriginalForm] = useState<FormFields | null>(null);
  const [conflictWarning, setConflictWarning] = useState<ConflictWarning | null>(null);

  useEffect(() => {
    if (!isEdit || clientId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const client = await ipc.getClient(clientId!);
        const fields = mapClientToFormFields(client);
        setForm(fields);
        setOriginalForm(fields);
        setUpdatedAt(client.updated_at);
      } catch (err) {
        log.error("Failed to load client:", err);
        navigate("/clients");
      } finally {
        setFormState("idle");
      }
    }
    load();
  }, [clientId, isEdit, navigate]);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
    if (conflictWarning?.fields.includes(field as string)) {
      setConflictWarning(null);
    }
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && clientId !== undefined) {
        await ipc.updateClient(clientId, { ...payload, updated_at: updatedAt! });
        navigate(`/clients/${clientId}`);
      } else {
        const created = await ipc.createClient(payload);
        navigate(`/clients/${created.id}`);
      }
    } catch (err) {
      if (err instanceof IpcError && err.code === "CONFLICT" && clientId !== undefined) {
        try {
          const fresh = await ipc.getClient(clientId);
          const freshForm = mapClientToFormFields(fresh);
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
      } else if (err instanceof IpcError && err.code === "UNIQUE_CONSTRAINT") {
        setSaveError("A client with this hospital number already exists.");
      } else {
        setSaveError("Failed to save client. Please try again.");
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
