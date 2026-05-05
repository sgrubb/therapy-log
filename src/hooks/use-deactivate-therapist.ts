import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import log from "@/lib/logger";
import { FormState } from "@/lib/types/enums";
import { queryKeys } from "@/lib/query-keys";
import type { Therapist } from "@shared/types/therapists";
import type { ClientId, TherapistId } from "@shared/types/brands";

export function useDeactivateTherapist(therapist: Therapist) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [formState, setFormState] = useState<FormState>(FormState.Idle);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clientReassignments, setClientReassignmentsState] = useState<Record<ClientId, TherapistId | null>>({});

  function openDialog() {
    setClientReassignmentsState({});
    setSaveError(null);
    setFormState(FormState.Idle);
    setShowDialog(true);
  }

  function dismissDialog() {
    setShowDialog(false);
    setSaveError(null);
  }

  function setClientReassignment(clientId: ClientId, newTherapistId: TherapistId | null) {
    setClientReassignmentsState((prev) => ({ ...prev, [clientId]: newTherapistId }));
  }

  async function handleDeactivate() {
    setFormState(FormState.Saving);
    setSaveError(null);
    try {
      await ipc.deactivateTherapist(therapist.id, {
        updated_at: therapist.updated_at,
        client_reassignments: Object.entries(clientReassignments)
          .filter(([, newId]) => newId !== null)
          .map(([clientId, newId]) => ({ client_id: Number(clientId) as ClientId, new_therapist_id: newId! })),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.therapists.root });
      await queryClient.invalidateQueries({ queryKey: queryKeys.clients.root });
      setShowDialog(false);
    } catch (err) {
      log.error("Failed to deactivate therapist:", err);
      setSaveError("Failed to deactivate therapist. Please try again.");
      setFormState(FormState.Error);
    }
  }

  return {
    showDialog,
    formState,
    saveError,
    clientReassignments,
    setClientReassignment,
    openDialog,
    dismissDialog,
    handleDeactivate,
  };
}
