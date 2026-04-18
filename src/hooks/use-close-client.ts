import { useState } from "react";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { ClientWithTherapist } from "@shared/types/clients";
import { Outcome } from "@shared/types/enums";
import { FormState } from "@/lib/types/enums";
import { closeClientSchema } from "@/lib/schemas/forms";
import { useFormState } from "@/hooks/use-form-state";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export type FormFields = z.input<typeof closeClientSchema>;

const EMPTY: FormFields = {
  close_date: format(new Date(), "yyyy-MM-dd"),
  post_score: "",
  outcome: "" as Outcome,
  closing_notes: "",
};

export function useCloseClient(clientId: number, client: ClientWithTherapist) {
  const queryClient = useQueryClient();
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
    setFormState(FormState.Idle);
    setShowCloseDialog(true);
  }

  function dismissCloseDialog() {
    setShowCloseDialog(false);
    setSaveError(null);
  }

  async function handleCloseClient() {
    if (!validate()) {
      return;
    }
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      const closingNotes = (form.closing_notes ?? "").trim();
      const existingNotes = client?.notes ?? "";
      const notesUpdate = closingNotes
        ? existingNotes ? `${existingNotes}\n\n${closingNotes}` : closingNotes
        : existingNotes || null;

      await ipc.closeClient(clientId, {
        post_score: form.post_score ? Number(form.post_score) : null,
        outcome: form.outcome as Outcome,
        closed_date: parse(form.close_date, "yyyy-MM-dd", new Date()),
        notes: notesUpdate,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.root });
      setShowCloseDialog(false);
    } catch (err) {
      log.error("Failed to close client:", err);
      setSaveError("Failed to close client. Please try again.");
      setFormState(FormState.Error);
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
