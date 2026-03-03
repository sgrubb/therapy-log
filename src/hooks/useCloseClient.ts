import { useState } from "react";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { ClientWithTherapist } from "@/types/ipc";
import { Outcome } from "@/types/enums";
import { closeClientSchema } from "@/schemas/forms";
import { useFormState } from "@/hooks/useFormState";

export type FormFields = z.input<typeof closeClientSchema>;

const EMPTY: FormFields = {
  post_score: "",
  outcome: "",
  closing_notes: "",
};

export function useCloseClient(
  clientId: number | undefined,
  client: ClientWithTherapist | null,
  onSuccess: (updated: ClientWithTherapist) => void,
) {
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const {
    form,
    setForm,
    saveError,
    setSaveError,
    formState,
    setFormState,
    clearError,
    validate,
    getError,
    markTouched,
  } = useFormState(closeClientSchema, EMPTY);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  function openCloseDialog() {
    setForm(EMPTY);
    setSaveError(null);
    setFormState("idle");
    setShowCloseDialog(true);
  }

  function dismissCloseDialog() {
    setShowCloseDialog(false);
    setSaveError(null);
  }

  async function handleCloseClient() {
    if (!validate()) return;
    setFormState("saving");
    setSaveError(null);
    try {
      const closingNotes = (form.closing_notes ?? "").trim();
      const existingNotes = client?.notes ?? "";
      const notesUpdate = (() => {
        if (!closingNotes) return existingNotes || undefined;
        return existingNotes ? `${existingNotes}\n\n${closingNotes}` : closingNotes;
      })();

      await ipc.updateClient(clientId!, {
        is_closed: true,
        post_score: form.post_score ? Number(form.post_score) : undefined,
        outcome: form.outcome as Outcome,
        notes: notesUpdate,
      });

      const updated = await ipc.getClient(clientId!);
      onSuccess(updated);
      setShowCloseDialog(false);
    } catch (err) {
      log.error("Failed to close client:", err);
      setSaveError("Failed to close client. Please try again.");
      setFormState("error");
    }
  }

  return {
    showCloseDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openCloseDialog,
    dismissCloseDialog,
    handleCloseClient,
  };
}
