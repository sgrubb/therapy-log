import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc, IpcError } from "@/lib/ipc";
import log from "@/lib/logger";
import { sessionFormSchema } from "@/schemas/forms";
import { SessionStatus, SESSION_DAY_INDEX } from "@/types/enums";
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
  duration: "",
  session_type: "" as SessionType,
  delivery_method: "" as DeliveryMethod,
  status: "" as SessionStatus,
  missed_reason: "",
  notes: "",
};

function mostRecentOccurrence(dayName: string): string {
  const target = SESSION_DAY_INDEX[dayName as keyof typeof SESSION_DAY_INDEX];
  if (target === undefined) {
    return "";
  }
  const today = new Date();
  const daysBack = (today.getDay() - target + 7) % 7;
  const result = new Date(today);
  result.setDate(today.getDate() - daysBack);
  return result.toISOString().split("T")[0]!;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function mapSessionToFormFields(session: SessionWithRelations): FormFields {
  return {
    client_id: session.client_id.toString(),
    therapist_id: session.therapist_id.toString(),
    date: session.scheduled_at.toISOString().split("T")[0]!,
    time: session.scheduled_at.toISOString().split("T")[1]?.slice(0, 5) ?? "",
    duration: minutesToHHMM(session.duration),
    session_type: session.session_type,
    delivery_method: session.delivery_method,
    status: session.status,
    missed_reason: session.missed_reason ?? "",
    notes: session.notes ?? "",
  };
}

function buildPayload(form: FormFields) {
  const dateStr = `${form.date}T${form.time}`;
  return {
    client_id: Number(form.client_id),
    therapist_id: Number(form.therapist_id),
    scheduled_at: new Date(dateStr),
    duration: hhmmToMinutes(form.duration),
    status: form.status as SessionStatus,
    session_type: form.session_type as SessionType,
    delivery_method: form.delivery_method as DeliveryMethod,
    missed_reason: (form.missed_reason || undefined) as MissedReason | undefined,
    notes: (form.notes ?? "").trim() || undefined,
  };
}

export interface SessionFormDefaults {
  clientId?: string;
  date?: string;
  time?: string;
  therapistId?: string;
  durationMins?: string;
}

export function useSessionForm(sessionId?: number, defaults?: SessionFormDefaults) {
  const navigate = useNavigate();
  const isEdit = sessionId !== undefined;

  const initialForm: FormFields = defaults && !isEdit
    ? {
        ...EMPTY,
        client_id: defaults.clientId ?? "",
        therapist_id: defaults.therapistId ?? "",
        date: defaults.date ?? "",
        time: defaults.time ?? "",
        duration: defaults.durationMins ? minutesToHHMM(Number(defaults.durationMins)) : "",
      }
    : EMPTY;

  const {
    form, setForm,
    setOriginalForm,
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
  } = useFormState(sessionFormSchema, initialForm);

  useEffect(() => {
    if (!isEdit || sessionId === undefined) {
      return;
    }
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
    clearConflictField(field);
  };

  function setClient(clientId: string, clients: ClientWithTherapist[]) {
    const client = clients.find((c) => c.id.toString() === clientId);
    // date and time are locked if they came from URL params (e.g. clicking a calendar slot)
    const lockDate = !!(defaults && !isEdit && defaults.date);
    const lockTime = !!(defaults && !isEdit && defaults.time);
    const lockDuration = !!(defaults && !isEdit && defaults.durationMins);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      therapist_id: prev.therapist_id || (client ? client.therapist_id.toString() : ""),
      time: lockTime ? prev.time : (client?.session_time ?? ""),
      date: lockDate ? prev.date : (client?.session_day ? mostRecentOccurrence(client.session_day) : ""),
      duration: lockDuration
        ? prev.duration
        : (client?.session_duration != null ? minutesToHHMM(client.session_duration) : prev.duration),
      delivery_method: (client?.session_delivery_method ?? prev.delivery_method) as DeliveryMethod,
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
        await handleConflict(async () => {
          const fresh = await ipc.getSession(sessionId);
          return { form: mapSessionToFormFields(fresh), updated_at: fresh.updated_at };
        });
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
    getConflictError,
    isEdit,
    set,
    setClient,
    handleSubmit,
    markTouched,
    getError,
  };
}
