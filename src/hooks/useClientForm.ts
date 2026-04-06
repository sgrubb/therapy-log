import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/queryKeys";
import { clientFormSchema } from "@/schemas/forms";
import { SessionDay, Outcome, FormState } from "@/types/enums";
import type { DeliveryMethod } from "@/types/enums";
import { useFormState } from "@/hooks/useFormState";
import type { ClientWithTherapist } from "@/types/ipc";

// Field names mirror the database schema (snake_case) so they map directly
// onto IPC payloads without a translation step.
export type FormFields = z.input<typeof clientFormSchema>;

function emptyForm(): FormFields {
  return {
    first_name: "",
    last_name: "",
    hospital_number: "",
    dob: "",
    start_date: format(new Date(), "yyyy-MM-dd"),
    address: "",
    phone: "",
    email: "",
    session_day: "",
    session_time: "",
    session_duration: "",
    session_delivery_method: "",
    therapist_id: "",
    pre_score: "",
    post_score: "",
    outcome: "",
    notes: "",
  };
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

function mapClientToFormFields(client: ClientWithTherapist): FormFields {
  return {
    first_name: client.first_name,
    last_name: client.last_name,
    hospital_number: client.hospital_number,
    dob: format(client.dob, "yyyy-MM-dd"),
    start_date: format(client.start_date, "yyyy-MM-dd"),
    address: client.address ?? "",
    phone: client.phone ?? "",
    email: client.email ?? "",
    session_day: client.session_day ?? "",
    session_time: client.session_time ?? "",
    session_duration: client.session_duration != null ? minutesToHHMM(client.session_duration) : "",
    session_delivery_method: client.session_delivery_method ?? "",
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
    dob: parse(form.dob, "yyyy-MM-dd", new Date()),
    start_date: parse(form.start_date, "yyyy-MM-dd", new Date()),
    address: (form.address ?? "").trim() || undefined,
    phone: (form.phone ?? "").trim() || undefined,
    email: (form.email ?? "").trim() || undefined,
    session_day: (form.session_day || undefined) as SessionDay | undefined,
    session_time: form.session_time || undefined,
    session_duration: form.session_duration ? hhmmToMinutes(form.session_duration) : undefined,
    session_delivery_method: (form.session_delivery_method || undefined) as DeliveryMethod | undefined,
    therapist_id: Number(form.therapist_id),
    pre_score: form.pre_score !== "" ? Number(form.pre_score) : undefined,
    post_score: form.post_score !== "" ? Number(form.post_score) : undefined,
    outcome: (form.outcome || undefined) as Outcome | undefined,
    notes: (form.notes ?? "").trim() || undefined,
  };
}

export function useClientForm(clientId?: number) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = clientId !== undefined;

  const { data: clientData } = useSuspenseQuery({
    queryKey: isEdit ? queryKeys.clients.detail(clientId!) : ["client-form", "new"],
    queryFn: isEdit
      ? () => ipc.getClient(clientId!)
      : (): Promise<ClientWithTherapist | null> => Promise.resolve(null),
    staleTime: isEdit ? 0 : Infinity,
  });

  const [isClosed, setIsClosed] = useState(clientData?.is_closed ?? false);

  const initialForm = clientData ? mapClientToFormFields(clientData) : emptyForm();

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
  } = useFormState(clientFormSchema, initialForm);

  useEffect(() => {
    if (clientData) {
      setOriginalForm(mapClientToFormFields(clientData));
      setUpdatedAt(clientData.updated_at);
      setIsClosed(clientData.is_closed);
    }
  }, []); // runs once on mount; data is stable after Suspense resolves

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev: FormFields) => ({ ...prev, [field]: value }));
    clearError(field);
    clearConflictField(field);
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && clientId !== undefined) {
        await ipc.updateClient(clientId, { ...payload, updated_at: updatedAt! });
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
        navigate(`/clients/${clientId}`);
      } else {
        const created = await ipc.createClient(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
        navigate(`/clients/${created.id}`);
      }
    } catch (err) {
      if (err instanceof IpcError && err.code === "CONFLICT" && clientId !== undefined) {
        await handleConflict(async () => {
          const fresh = await ipc.getClient(clientId);
          return { form: mapClientToFormFields(fresh), updated_at: fresh.updated_at };
        });
      } else if (err instanceof IpcError && err.code === "UNIQUE_CONSTRAINT") {
        setSaveError("A client with this hospital number already exists.");
      } else {
        setSaveError("Failed to save client. Please try again.");
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
    isClosed,
    set,
    handleSubmit,
    markTouched,
    getError,
  };
}
