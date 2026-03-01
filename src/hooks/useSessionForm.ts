import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import { sessionFormSchema } from "@/schemas/forms";
import { SessionStatus } from "@/types/enums";
import type { SessionType, DeliveryMethod, MissedReason } from "@/types/enums";
import type { ClientWithTherapist } from "@/types/ipc";
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

  useEffect(() => {
    if (!isEdit || sessionId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const session = await ipc.getSession(sessionId!);
        setForm({
          client_id: session.client_id.toString(),
          therapist_id: session.therapist_id.toString(),
          date: session.scheduled_at.toISOString().split("T")[0]!,
          time: session.scheduled_at.toISOString().split("T")[1]?.slice(0, 5) ?? "",
          session_type: session.session_type,
          delivery_method: session.delivery_method,
          status: session.status,
          missed_reason: session.missed_reason ?? "",
          notes: session.notes ?? "",
        });
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
        await ipc.updateSession(sessionId, payload);
        navigate(`/sessions/${sessionId}`);
      } else {
        const created = await ipc.createSession(payload);
        navigate(`/sessions/${created.id}`);
      }
    } catch (err) {
      setSaveError("Failed to save session. Please try again.");
      setFormState("error");
    }
  }

  return {
    form,
    formState,
    saveError,
    isEdit,
    set,
    setClient,
    handleSubmit,
    markTouched,
    getError,
  };
}
