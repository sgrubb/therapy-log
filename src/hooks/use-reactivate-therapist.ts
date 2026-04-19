import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import { FormState } from "@/lib/types/enums";
import { queryKeys } from "@/lib/query-keys";
import type { Therapist } from "@shared/types/therapists";

export function useReactivateTherapist(therapist: Therapist) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formState, setFormState] = useState<FormState>(FormState.Idle);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openDialog() {
    setSaveError(null);
    setFormState(FormState.Idle);
    setShowDialog(true);
  }

  function dismissDialog() {
    setShowDialog(false);
    setSaveError(null);
  }

  async function handleReactivate() {
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      await ipc.reactivateTherapist(therapist.id, { updated_at: therapist.updated_at });
      await queryClient.invalidateQueries({ queryKey: queryKeys.therapists.root });
      setShowDialog(false);
    } catch (err) {
      log.error("Failed to reactivate therapist:", err);
      setSaveError("Failed to reactivate therapist. Please try again.");
      setFormState(FormState.Error);
    }
  }

  return {
    showDialog,
    formState,
    saveError,
    openDialog,
    dismissDialog,
    handleReactivate,
  };
}
