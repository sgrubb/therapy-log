import { useState } from "react";
import { format, parse } from "date-fns";
import type { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { ipc, IpcError } from "@/lib/ipc";
import { IpcErrorCode } from "@shared/types/ipc";
import log from "@/lib/logger";
import type { SessionWithClientAndTherapist } from "@shared/types/sessions";
import { SessionStatus } from "@shared/types/enums";
import type { MissedReason } from "@shared/types/enums";
import { FormState } from "@/lib/types/enums";
import { confirmSessionSchema } from "@/lib/schemas/forms";
import { useFormState } from "@/hooks/use-form-state";
import { queryKeys } from "@/lib/query-keys";

export type FormFields = z.input<typeof confirmSessionSchema>;

const EMPTY: FormFields = {
  occurred_date: "",
  occurred_time: "",
  status: "" as SessionStatus,
  missed_reason: "",
};

export function useConfirmSession(session: SessionWithClientAndTherapist) {
  const queryClient = useQueryClient();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
  } = useFormState(confirmSessionSchema, EMPTY);

  const set = <K extends keyof FormFields>(field: K, value: FormFields[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "status" && value === SessionStatus.Attended) {
        next.missed_reason = "";
      }
      return next;
    });
    clearError(field);
  };

  function openConfirmDialog() {
    setForm({
      occurred_date: format(session.scheduled_at, "yyyy-MM-dd"),
      occurred_time: format(session.scheduled_at, "HH:mm"),
      status: "" as SessionStatus,
      missed_reason: "",
    });
    setSaveError(null);
    setFormState(FormState.Idle);
    setShowConfirmDialog(true);
  }

  function dismissConfirmDialog() {
    setShowConfirmDialog(false);
    setSaveError(null);
  }

  async function handleConfirm() {
    if (!validate()) {
      return;
    }
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      await ipc.confirmSession(session.id, {
        updated_at: session.updated_at,
        status: form.status as SessionStatus,
        occurred_at: parse(
          `${form.occurred_date} ${form.occurred_time}`,
          "yyyy-MM-dd HH:mm",
          new Date(),
        ),
        missed_reason: form.missed_reason ? (form.missed_reason as MissedReason) : null,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.detail(session.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions.root });
      setShowConfirmDialog(false);
    } catch (err) {
      log.error("Failed to confirm session:", err);
      if (err instanceof IpcError && err.code === IpcErrorCode.Conflict) {
        setSaveError("This session was modified by someone else. Please refresh and try again.");
      } else {
        setSaveError("Failed to confirm session. Please try again.");
      }
      setFormState(FormState.Error);
    }
  }

  return {
    showConfirmDialog,
    form,
    saveError,
    formState,
    getError,
    markTouched,
    set,
    openConfirmDialog,
    dismissConfirmDialog,
    handleConfirm,
  };
}
