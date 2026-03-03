import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import { therapistFormSchema } from "@/schemas/forms";
import { useFormState } from "@/hooks/useFormState";
import { useTherapist } from "@/context/TherapistContext";

export type FormFields = z.input<typeof therapistFormSchema>;

const EMPTY: FormFields = {
  first_name: "",
  last_name: "",
  is_admin: false,
};

function buildPayload(form: FormFields) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    is_admin: form.is_admin,
  };
}

export function useTherapistForm(therapistId?: number) {
  const navigate = useNavigate();
  const { refreshTherapists } = useTherapist();
  const isEdit = therapistId !== undefined;

  const {
    form, setForm,
    saveError, setSaveError,
    formState, setFormState,
    clearError,
    markTouched,
    validate,
    getError,
  } = useFormState(therapistFormSchema, EMPTY);

  useEffect(() => {
    if (!isEdit || therapistId === undefined) return;
    async function load() {
      setFormState("loading");
      try {
        const therapist = await ipc.getTherapist(therapistId!);
        setForm({
          first_name: therapist.first_name,
          last_name: therapist.last_name,
          is_admin: therapist.is_admin,
        });
      } catch (err) {
        log.error("Failed to load therapist:", err);
        navigate("/therapists");
      } finally {
        setFormState("idle");
      }
    }
    load();
  }, [therapistId, isEdit, navigate]);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && therapistId !== undefined) {
        await ipc.updateTherapist(therapistId, payload);
      } else {
        await ipc.createTherapist(payload);
      }
      await refreshTherapists();
      navigate("/therapists");
    } catch (err) {
      log.error("Failed to save therapist:", err);
      setSaveError("Failed to save therapist. Please try again.");
      setFormState("error");
    }
  }

  return {
    form,
    formState,
    saveError,
    isEdit,
    set,
    handleSubmit,
    markTouched,
    getError,
  };
}
