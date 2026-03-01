import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc, IpcError } from "@/lib/ipc";
import { clientFormSchema } from "@/schemas/forms";
import { SessionDay, Outcome } from "@/types/enums";
import { useFormState } from "@/hooks/useFormState";

export type FormFields = z.input<typeof clientFormSchema>;
export type FieldErrors = Partial<Record<keyof FormFields, string>>;

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

export function useClientForm(clientId?: number) {
  const navigate = useNavigate();
  const isEdit = clientId !== undefined;

  const {
    form, setForm,
    errors,
    saveError, setSaveError,
    formState, setFormState,
    touched,
    clearFieldError,
    markTouched,
    validate,
  } = useFormState(clientFormSchema, EMPTY);

  useEffect(() => {
    if (!isEdit || clientId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const client = await ipc.getClient(clientId!);
        setForm({
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
        });
      } catch (err) {
        console.error("Failed to load client:", err);
        navigate("/clients");
      } finally {
        setFormState("idle");
      }
    }
    load();
  }, [clientId, isEdit, navigate]);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && clientId !== undefined) {
        await ipc.updateClient(clientId, payload);
        navigate(`/clients/${clientId}`);
      } else {
        const created = await ipc.createClient(payload);
        navigate(`/clients/${created.id}`);
      }
    } catch (err) {
      if (err instanceof IpcError && err.code === "UNIQUE_CONSTRAINT") {
        setSaveError("A client with this hospital number already exists.");
      } else {
        setSaveError("Failed to save client. Please try again.");
      }
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
    handleSubmit,
    markTouched,
  };
}
