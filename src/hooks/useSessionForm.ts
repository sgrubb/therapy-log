import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc, IpcError } from "@/lib/ipc";
import log from "@/lib/logger";
import { sessionFormSchema } from "@/schemas/forms";
import { SessionStatus } from "@/types/enums";
import type { SessionType, DeliveryMethod, MissedReason } from "@/types/enums";
import type { ClientWithTherapist, SessionWithRelations } from "@/types/ipc";
import { useFormState } from "@/hooks/useFormState";

// Field names mirror the database schema (snake_case) so they map directly
// onto IPC payloads without a translation step.
export type FormFields = z.input<typeof sessionFormSchema>;

const EMPTY: FormFields = {
  client_id: "",
  therapist_id: "",
  date: "",
  time: "",
  session_type: "" as SessionType,
  delivery_method: "" as DeliveryMethod,
  status: "" as SessionStatus,
  missed_reason: "",
  notes: "",
};

function mapSessionToFormFields(session: SessionWithRelations): FormFields {
  return {
    client_id: session.client_id.toString(),
    therapist_id: session.therapist_id.toString(),
    date: session.scheduled_at.toISOString().split("T")[0]!,
    time: session.scheduled_at.toISOString().split("T")[1]?.slice(0, 5) ?? "",
    session_type: session.session_type,
    delivery_method: session.delivery_method,
    status: session.status,
    missed_reason: session.missed_reason ?? "",
    notes: session.notes ?? "",
  };
}

function buildPayload(form: FormFields) {
  const dateStr = form.time ? `${form.date}T${form.time}` : form.date;
  return {
    client_id: Number(form.client_id),
    therapist_id: Number(form.therapist_id),
    scheduled_at: new Date(dateStr),
    status: form.status as SessionStatus,
    session_type: form.session_type as SessionType,
    delivery_method: form.delivery_method as DeliveryMethod,
    missed_reason: (form.missed_reason || undefined) as MissedReason | undefined,
    notes: (form.notes ?? "").trim() || undefined,
  };
}

export type ConflictWarning = { fields: string[]; message: string };

export function useSessionForm(sessionId?: number) {
  const navigate = useNavigate();
  const isEdit = sessionId !== undefined;

  const {
    form, setForm,
    saveError, setSaveError,
    formState, setFormState,
    clearError,
    markTouched,
    validate,
    getError,
  } = useFormState(sessionFormSchema, EMPTY);

  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [originalForm, setOriginalForm] = useState<FormFields | null>(null);
  const [conflictWarning, setConflictWarning] = useState<ConflictWarning | null>(null);

  useEffect(() => {
    if (!isEdit || sessionId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const session = await ipc.getSession(sessionId!);
        const fields = mapSessionToFormFields(session);
        setForm(fields);
        setOriginalForm(fields);
        setUpdatedAt(session.updated_at);
      } catch (err) {
        log.error("Failed to load session:", err);
        navigate("/sessions");
      } finally {
        setFormState("idle");
      }
    }
    load();
  }, [sessionId, isEdit, navigate]);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "status" && value === SessionStatus.Attended) {
        next.missed_reason = "";
      }
      return next;
    });
    clearError(field);
    if (conflictWarning?.fields.includes(field as string)) {
      setConflictWarning(null);
    }
  };

  function setClient(clientId: string, clients: ClientWithTherapist[]) {
    const client = clients.find((c) => c.id.toString() === clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      therapist_id: prev.therapist_id || (client ? client.therapist_id.toString() : ""),
    }));
    clearError("client_id");
    clearError("therapist_id");
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && sessionId !== undefined) {
        await ipc.updateSession(sessionId, { ...payload, updated_at: updatedAt! });
        navigate(`/sessions/${sessionId}`);
      } else {
        const created = await ipc.createSession(payload);
        navigate(`/sessions/${created.id}`);
      }
    } catch (err) {
      if (err instanceof IpcError && err.code === "CONFLICT" && sessionId !== undefined) {
        try {
          const fresh = await ipc.getSession(sessionId);
          const freshForm = mapSessionToFormFields(fresh);
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
        setSaveError("Failed to save session. Please try again.");
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
    setClient,
    handleSubmit,
    markTouched,
    getError,
  };
}
