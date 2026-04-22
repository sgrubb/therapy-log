import { useMemo } from "react";
import { Dialog } from "radix-ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ipc } from "@/lib/ipc";
import { queryKeys } from "@/lib/query-keys";
import { useDeactivateTherapist } from "@/hooks/use-deactivate-therapist";
import { FormState } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { Therapist } from "@shared/types/therapists";

interface Props {
  therapist: Therapist;
}

export function DeactivateTherapistDialog({ therapist }: Props) {
  const {
    showDialog,
    formState,
    saveError,
    clientReassignments,
    setClientReassignment,
    openDialog,
    dismissDialog,
    handleDeactivate,
  } = useDeactivateTherapist(therapist);

  const saving = formState === FormState.Saving;

  return (
    <Dialog.Root open={showDialog} onOpenChange={(open) => { if (!open) { dismissDialog(); } }}>
      <Dialog.Trigger asChild>
        <Button onClick={openDialog}>Deactivate</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">Deactivate Therapist</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Deactivating {therapist.first_name} {therapist.last_name} requires reassigning each
            open client to a replacement therapist.
          </Dialog.Description>

          <SaveErrorAlert message={saveError} />

          <DeactivateDialogBody
            therapistId={therapist.id}
            saving={saving}
            clientReassignments={clientReassignments}
            setClientReassignment={setClientReassignment}
            onConfirm={handleDeactivate}
            onCancel={dismissDialog}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface BodyProps {
  therapistId: number;
  saving: boolean;
  clientReassignments: Record<number, number | null>;
  setClientReassignment: (clientId: number, therapistId: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeactivateDialogBody({
  therapistId,
  saving,
  clientReassignments,
  setClientReassignment,
  onConfirm,
  onCancel,
}: BodyProps) {
  const { data: openClients } = useSuspenseQuery({
    queryKey: [...queryKeys.clients.all, { therapistId, openOnly: true }],
    queryFn: () => ipc.listAllClients({ therapistId, openOnly: true }),
  });

  const { data: activeTherapists } = useSuspenseQuery({
    queryKey: [...queryKeys.therapists.all, { activeOnly: true }],
    queryFn: () => ipc.listAllTherapists({ activeOnly: true }),
  });

  const replacementOptions = useMemo(
    () => activeTherapists
      .filter((t) => t.id !== therapistId)
      .map((t) => ({ value: t.id.toString(), label: `${t.first_name} ${t.last_name}` })),
    [activeTherapists, therapistId],
  );

  const allAssigned = openClients.every((c) => clientReassignments[c.id] != null);
  const canConfirm = !saving && allAssigned;

  return (
    <>
      {openClients.length > 0 ? (
        <div className="space-y-5">
          {openClients.map((client) => (
            <Field
              key={client.id}
              label={`${client.first_name} ${client.last_name} *`}
            >
              <SearchableSelect
                options={replacementOptions}
                value={clientReassignments[client.id]?.toString() ?? ""}
                onValueChange={(v) => setClientReassignment(client.id, v ? Number(v) : null)}
                placeholder="Select replacement therapist…"
              />
            </Field>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          This therapist has no open clients.
        </p>
      )}

      <div className="flex gap-3">
        <Button onClick={onConfirm} disabled={!canConfirm} variant="destructive">
          {saving ? "Deactivating…" : "Confirm Deactivate"}
        </Button>
        <Dialog.Close asChild>
          <Button variant="outline" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </Dialog.Close>
      </div>
    </>
  );
}
