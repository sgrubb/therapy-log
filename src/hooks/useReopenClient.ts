import { useState } from "react";
import { format } from "date-fns";
import type { z } from "zod";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import type { ClientWithTherapist } from "@shared/types/clients";
import { reopenClientSchema } from "@/schemas/forms";
import { useFormState } from "@/hooks/useFormState";
import { FormState } from "@/types/enums";
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
    setFormState(FormState.Idle);
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
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      const reopenNotes = (form.reopen_notes ?? "").trim();
      const existingNotes = client?.notes ?? "";
      const reopenDate = new Date();
      const closedLine = client?.closed_date
        ? [
            `Client closed on ${format(client.closed_date, "dd MMM yyyy")}`,
            client.outcome ? `Outcome: ${client.outcome}` : null,
            client.post_score != null ? `Post-score: ${client.post_score}` : null,
          ]
            .filter(Boolean)
            .join(", ")
        : null;
      const reopenLine = `Client reopened on ${format(reopenDate, "dd MMM yyyy")}`;
      const appendedEntry = [
        closedLine,
        reopenLine,
        reopenNotes || null,
      ]
        .filter(Boolean)
        .join("\n");
      const notesUpdate = existingNotes ? `${existingNotes}\n\n${appendedEntry}` : appendedEntry;

      await ipc.reopenClient(clientId, { notes: notesUpdate });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(clientId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.root });
      setShowReopenDialog(false);
    } catch (err) {
      log.error("Failed to reopen client:", err);
      setSaveError("Failed to reopen client. Please try again.");
      setFormState(FormState.Error);
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
