import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { z } from "zod";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { therapistFormSchema } from "@/lib/schemas/forms";
import { useFormState } from "@/hooks/use-form-state";
import { FormState } from "@/lib/types/enums";
import type { Therapist } from "@shared/types/therapists";

export type FormFields = z.input<typeof therapistFormSchema>;

const EMPTY: FormFields = {
  first_name: "",
  last_name: "",
  is_admin: false,
};

function mapTherapistToFormFields(therapist: Therapist): FormFields {
  return {
    first_name: therapist.first_name,
    last_name: therapist.last_name,
    is_admin: therapist.is_admin,
  };
}

function buildPayload(form: FormFields) {
  return {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    is_admin: form.is_admin,
  };
}

export function useTherapistForm(therapistId?: number) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = therapistId !== undefined;

  const { data: therapistData } = useSuspenseQuery({
    queryKey: isEdit ? queryKeys.therapists.detail(therapistId!) : ["therapist-form", "new"],
    queryFn: isEdit
      ? () => ipc.getTherapist(therapistId!)
      : (): Promise<Therapist | null> => Promise.resolve(null),
    staleTime: isEdit ? 0 : Infinity,
  });

  const initialForm = therapistData ? mapTherapistToFormFields(therapistData) : EMPTY;

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
  } = useFormState(therapistFormSchema, initialForm);

  useEffect(() => {
    if (therapistData) {
      setOriginalForm(mapTherapistToFormFields(therapistData));
      setUpdatedAt(therapistData.updated_at);
    }
  }, []); // runs once on mount; data is stable after Suspense resolves

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
    clearConflictField(field);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) {
      return;
    }
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      const payload = buildPayload(form);
      if (isEdit && therapistId !== undefined) {
        await ipc.updateTherapist(therapistId, { ...payload, updated_at: updatedAt! });
        await queryClient.invalidateQueries({ queryKey: queryKeys.therapists.root });
        await queryClient.invalidateQueries({ queryKey: queryKeys.therapists.detail(therapistId) });
      } else {
        await ipc.createTherapist(payload);
        await queryClient.invalidateQueries({ queryKey: queryKeys.therapists.root });
      }
      navigate("/therapists");
    } catch (err) {
      if (err instanceof IpcError && err.code === "CONFLICT" && therapistId !== undefined) {
        await handleConflict(async () => {
          const fresh = await ipc.getTherapist(therapistId);
          return { form: mapTherapistToFormFields(fresh), updated_at: fresh.updated_at };
        });
      } else {
        setSaveError("Failed to save therapist. Please try again.");
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
    handleSubmit,
    markTouched,
    getError,
  };
}
