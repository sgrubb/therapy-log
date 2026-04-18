import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { clientFormSchema } from "@/lib/schemas/forms";
import { SessionDay, Outcome } from "@shared/types/enums";
import type { DeliveryMethod } from "@shared/types/enums";
import { FormState } from "@/lib/types/enums";
import { useFormState } from "@/hooks/use-form-state";
import type { ClientWithTherapist } from "@shared/types/clients";
import { toDuration, fromDuration } from "@/lib/utils/sessions";

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
    session_duration: { hours: 0, minutes: 0 },
    session_delivery_method: "",
    therapist_id: "",
    closed_date: "",
    pre_score: "",
    post_score: "",
    outcome: "",
    notes: "",
  };
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
    session_duration: client.session_duration != null ? toDuration(client.session_duration) : { hours: 0, minutes: 0 },
    session_delivery_method: client.session_delivery_method ?? "",
    therapist_id: client.therapist_id.toString(),
    closed_date: client.closed_date ? format(client.closed_date, "yyyy-MM-dd") : "",
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
    address: (form.address ?? "").trim() || null,
    phone: (form.phone ?? "").trim() || null,
    email: (form.email ?? "").trim() || null,
    session_day: (form.session_day || null) as SessionDay | null,
    session_time: form.session_time || null,
    session_duration: fromDuration(form.session_duration) || null,
    session_delivery_method: (form.session_delivery_method || null) as DeliveryMethod | null,
    therapist_id: Number(form.therapist_id),
    closed_date: form.closed_date ? parse(form.closed_date, "yyyy-MM-dd", new Date()) : null,
    pre_score: form.pre_score !== "" ? Number(form.pre_score) : null,
    post_score: form.post_score !== "" ? Number(form.post_score) : null,
    outcome: (form.outcome || null) as Outcome | null,
    notes: (form.notes ?? "").trim() || null,
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

  const [isClosed, setIsClosed] = useState(clientData?.closed_date != null);

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
      setIsClosed(clientData.closed_date != null);
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
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.root });
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
        navigate(`/clients/${clientId}`);
      } else {
        const created = await ipc.createClient(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.clients.root });
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
