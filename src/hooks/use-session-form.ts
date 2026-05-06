import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { IpcErrorCode } from "@shared/types/ipc";
import { queryKeys } from "@/lib/query-keys";
import { sessionFormSchema } from "@/lib/schemas/forms";
import { SessionStatus } from "@shared/types/enums";
import type { SessionType, DeliveryMethod, MissedReason } from "@shared/types/enums";
import { FormState } from "@/lib/types/enums";
import type { ClientWithTherapist } from "@shared/types/clients";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import { clientId, therapistId } from "@shared/types/brands";
import type { SessionId } from "@shared/types/brands";
import { useFormState } from "@/hooks/use-form-state";
import { mostRecentOccurrence, toDuration, fromDuration } from "@/lib/utils/sessions";

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
  occurred_date: "",
  occurred_time: "",
  missed_reason: "",
  notes: "",
};

function mapSessionToFormFields(session: SessionWithClientAndTherapist): FormFields {
  return {
    client_id: session.client_id.toString(),
    therapist_id: session.therapist_id.toString(),
    date: format(session.scheduled_at, "yyyy-MM-dd"),
    time: format(session.scheduled_at, "HH:mm"),
    duration: toDuration(session.duration),
    session_type: session.session_type,
    delivery_method: session.delivery_method,
    status: session.status ?? "",
    occurred_date: session.occurred_at !== null ? format(session.occurred_at, "yyyy-MM-dd") : "",
    occurred_time: session.occurred_at !== null ? format(session.occurred_at, "HH:mm") : "",
    missed_reason: session.missed_reason ?? "",
    notes: session.notes ?? "",
  };
}

function isPastDateTime(date: string, time: string): boolean {
  if (!date || !time) {
    return false;
  }
  const dt = parse(`${date} ${time}`, "yyyy-MM-dd HH:mm", new Date());
  return !isNaN(dt.getTime()) && dt < new Date();
}

// buildPayload drops any post-session fields when the scheduled date/time is in
// the future. The form hides those fields in that case, but values can linger
// in state if the user toggles the date back and forth. occurred_at is only
// kept when status is Attended — for missed/cancelled/rescheduled sessions the
// session never happened, so the field has no meaning.
function buildPayload(form: FormFields) {
  const scheduled_at = parse(`${form.date} ${form.time}`, "yyyy-MM-dd HH:mm", new Date());
  const isPast = scheduled_at < new Date();
  const status = isPast && form.status ? (form.status as SessionStatus) : null;
  const occurred_at = status === SessionStatus.Attended && form.occurred_date && form.occurred_time
    ? parse(`${form.occurred_date} ${form.occurred_time}`, "yyyy-MM-dd HH:mm", new Date())
    : null;
  return {
    client_id: clientId(Number(form.client_id)),
    therapist_id: therapistId(Number(form.therapist_id)),
    scheduled_at,
    duration: fromDuration(form.duration),
    status,
    session_type: form.session_type as SessionType,
    delivery_method: form.delivery_method as DeliveryMethod,
    occurred_at,
    missed_reason: isPast && form.missed_reason ? (form.missed_reason as MissedReason) : null,
    notes: form.notes?.trim() || null,
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

export function useSessionForm(sessionId?: SessionId, defaults?: SessionFormDefaults) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = sessionId !== undefined;

  const { data: sessionData } = useSuspenseQuery({
    queryKey: isEdit ? queryKeys.sessions.detail(sessionId!) : ["session-form", "new"],
    queryFn: isEdit
      ? () => ipc.getSession(sessionId!)
      : (): Promise<SessionWithClientAndTherapist | null> => Promise.resolve(null),
    staleTime: isEdit ? 0 : Infinity,
  });

  const initialForm: FormFields = (() => {
    if (sessionData) {
      return mapSessionToFormFields(sessionData);
    }
    if (defaults) {
      const date = defaults.date ?? "";
      const time = defaults.time ?? "";
      const occurred = isPastDateTime(date, time)
        ? { occurred_date: date, occurred_time: time }
        : { occurred_date: "", occurred_time: "" };
      return {
        ...EMPTY,
        client_id: defaults.clientId ?? "",
        therapist_id: defaults.therapistId ?? "",
        date,
        time,
        duration: defaults.durationMins ? toDuration(Number(defaults.durationMins)) : { hours: 0, minutes: 0 },
        delivery_method: (defaults.deliveryMethod ?? "") as DeliveryMethod,
        ...occurred,
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
      if (field === "status") {
        if (value === SessionStatus.Attended || value === "") {
          next.missed_reason = "";
        }
        if (value !== SessionStatus.Attended) {
          next.occurred_date = "";
          next.occurred_time = "";
        } else if (!prev.occurred_date && !prev.occurred_time) {
          // Default occurred to the scheduled values when the user picks
          // Attended — assumes the session ran when planned, easy to edit.
          next.occurred_date = next.date;
          next.occurred_time = next.time;
        }
      }
      // When the scheduled date/time changes to a past value and occurred is
      // empty, default occurred to the scheduled values — assumes the session
      // ran when planned, easy to edit.
      if ((field === "date" || field === "time")
        && isPastDateTime(next.date, next.time)
        && next.status === SessionStatus.Attended
        && !prev.occurred_date && !prev.occurred_time) {
        next.occurred_date = next.date;
        next.occurred_time = next.time;
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
    setForm((prev) => {
      const date = lockDate ? prev.date : (client?.session_day ? mostRecentOccurrence(client.session_day) : "");
      const time = lockTime ? prev.time : (client?.session_time ?? "");
      const occurred = !prev.occurred_date && !prev.occurred_time && isPastDateTime(date, time)
        ? { occurred_date: date, occurred_time: time }
        : { occurred_date: prev.occurred_date, occurred_time: prev.occurred_time };
      return {
        ...prev,
        client_id: clientId,
        therapist_id: prev.therapist_id || (client ? client.therapist_id.toString() : ""),
        time,
        date,
        duration: lockDuration
          ? prev.duration
          : (client?.session_duration != null ? toDuration(client.session_duration) : prev.duration),
        delivery_method: (client?.session_delivery_method ?? prev.delivery_method) as DeliveryMethod,
        ...occurred,
      };
    });
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
      if (err instanceof IpcError && err.code === IpcErrorCode.Conflict && sessionId !== undefined) {
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
