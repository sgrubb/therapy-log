import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { ipc } from "@/lib/ipc";
import { sessionFormSchema } from "@/schemas/forms";
import { SessionStatus } from "@/types/enums";
import type { SessionType, DeliveryMethod, MissedReason } from "@/types/enums";
import type { ClientWithTherapist } from "@/types/ipc";

export type FormFields = z.input<typeof sessionFormSchema>;
export type FieldErrors = Partial<Record<keyof FormFields, string>>;
type FormState = "idle" | "loading" | "saving" | "error";

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

  const [form, setForm] = useState<FormFields>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>("idle");
  const [touched, setTouched] = useState<Set<string>>(new Set());

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
        console.error("Failed to load session:", err);
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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  function setClient(clientId: string, clients: ClientWithTherapist[]) {
    const client = clients.find((c) => c.id.toString() === clientId);
    setForm((prev) => ({
      ...prev,
      client_id: clientId,
      therapist_id: prev.therapist_id || (client ? client.therapist_id.toString() : ""),
    }));
    setErrors((prev) => ({ ...prev, client_id: undefined, therapist_id: undefined }));
  }

  function markTouched(field: string) {
    setTouched((prev) => new Set(prev).add(field));
    const result = sessionFormSchema.safeParse(form);
    const fieldKey = field as keyof FormFields;
    if (result.success) {
      setErrors((prev) => ({ ...prev, [fieldKey]: undefined }));
    } else {
      const tree = z.treeifyError(result.error);
      setErrors((prev) => ({
        ...prev,
        [fieldKey]: tree.properties?.[fieldKey]?.errors?.[0],
      }));
    }
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const allFields = Object.keys(EMPTY) as (keyof FormFields)[];
    setTouched(new Set(allFields));

    const result = sessionFormSchema.safeParse(form);
    if (!result.success) {
      const tree = z.treeifyError(result.error);
      const errs = Object.fromEntries(
        allFields.map((field) => [field, tree.properties?.[field]?.errors?.[0]])
      ) as FieldErrors;
      setErrors(errs);
      return;
    }

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
    errors,
    formState,
    saveError,
    touched,
    isEdit,
    set,
    setClient,
    handleSubmit,
    markTouched,
  };
}
