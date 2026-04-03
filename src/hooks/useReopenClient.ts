import { useState } from "react";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { ClientWithTherapist } from "@/types/ipc";
import { reopenClientSchema } from "@/schemas/forms";
import { useFormState } from "@/hooks/useFormState";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export type FormFields = z.input<typeof reopenClientSchema>;

const EMPTY: FormFields = {
  reopen_notes: "",
};

export function useReopenClient(clientId: number, client: ClientWithTherapist) {
  const queryClient = useQueryClient();
  const [showReopenDialog, setShowReopenDialog] = useState(false);

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
  } = useFormState(reopenClientSchema, EMPTY);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  function openReopenDialog() {
    setForm(EMPTY);
    setSaveError(null);
    setFormState("idle");
    setShowReopenDialog(true);
  }

  function dismissReopenDialog() {
    setShowReopenDialog(false);
    setSaveError(null);
  }

  async function handleReopenClient() {
    if (!validate()) {
      return;
    }
    setFormState("saving");
    setSaveError(null);
    try {
      const reopenNotes = (form.reopen_notes ?? "").trim();
      const existingNotes = client?.notes ?? "";
      const date = new Date().toLocaleDateString("en-GB");
      const appendedEntry = `Client reopened - ${date}\n${reopenNotes}`;
      const notesUpdate = existingNotes ? `${existingNotes}\n\n${appendedEntry}` : appendedEntry;

      await ipc.reopenClient(clientId, { notes: notesUpdate });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      setShowReopenDialog(false);
    } catch (err) {
      log.error("Failed to reopen client:", err);
      setSaveError("Failed to reopen client. Please try again.");
      setFormState("error");
    }
  }

  return {
    showReopenDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openReopenDialog,
    dismissReopenDialog,
    handleReopenClient,
  };
}
