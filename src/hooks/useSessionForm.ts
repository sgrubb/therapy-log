import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { sessionFormSchema } from "@/schemas/forms";
import { SessionStatus, FormState } from "@/types/enums";
import type { SessionType, DeliveryMethod, MissedReason } from "@/types/enums";
import type { ClientWithTherapist } from "@/types/clients";
import type { SessionWithRelations } from "@/types/sessions";
import { useFormState } from "@/hooks/useFormState";
import { mostRecentOccurrence, toDuration, fromDuration } from "@/lib/sessions-utils";

// Field names mirror the database schema (snake_case) so they map directly
// onto IPC payloads without a translation step.
export type FormFields = z.input<typeof sessionFormSchema>;


const EMPTY: FormFields = {
  client_id: "",
  therapist_id: "",
  date: "",
  time: "",
  duration: { hours: 0, minutes: 0 },
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
    date: format(session.scheduled_at, "yyyy-MM-dd"),
    time: format(session.scheduled_at, "HH:mm"),
    duration: toDuration(session.duration),
    session_type: session.session_type,
    delivery_method: session.delivery_method,
    status: session.status,
    missed_reason: session.missed_reason ?? "",
    notes: session.notes ?? "",
  };
}

function buildPayload(form: FormFields) {
  return {
    client_id: Number(form.client_id),
    therapist_id: Number(form.therapist_id),
    scheduled_at: parse(`${form.date} ${form.time}`, "yyyy-MM-dd HH:mm", new Date()),
    duration: fromDuration(form.duration),
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
  deliveryMethod?: string;
}

export function useSessionForm(sessionId?: number, defaults?: SessionFormDefaults) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = sessionId !== undefined;

  const { data: sessionData } = useSuspenseQuery({
    queryKey: isEdit ? queryKeys.sessions.detail(sessionId!) : ["session-form", "new"],
    queryFn: isEdit
      ? () => ipc.getSession(sessionId!)
      : (): Promise<SessionWithRelations | null> => Promise.resolve(null),
    staleTime: isEdit ? 0 : Infinity,
  });

  const initialForm: FormFields = (() => {
    if (sessionData) {
      return mapSessionToFormFields(sessionData);
    }
    if (defaults) {
      return {
        ...EMPTY,
        client_id: defaults.clientId ?? "",
        therapist_id: defaults.therapistId ?? "",
        date: defaults.date ?? "",
        time: defaults.time ?? "",
        duration: defaults.durationMins ? toDuration(Number(defaults.durationMins)) : { hours: 0, minutes: 0 },
        delivery_method: (defaults.deliveryMethod ?? "") as DeliveryMethod,
      };
    }
    return EMPTY;
  })();

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
    if (sessionData) {
      setOriginalForm(mapSessionToFormFields(sessionData));
      setUpdatedAt(sessionData.updated_at);
    }
  }, []); // runs once on mount; data is stable after Suspense resolves

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
        : (client?.session_duration != null ? toDuration(client.session_duration) : prev.duration),
      delivery_method: (client?.session_delivery_method ?? prev.delivery_method) as DeliveryMethod,
    }));
    clearError("client_id");
    clearError("therapist_id");
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && sessionId !== undefined) {
        await ipc.updateSession(sessionId, { ...payload, updated_at: updatedAt! });
        await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.root });
        await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(sessionId) });
        navigate(`/sessions/${sessionId}`);
      } else {
        const created = await ipc.createSession(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.root });
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
      setFormState(FormState.Error);
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
