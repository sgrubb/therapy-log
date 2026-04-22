import { Dialog } from "radix-ui";
import { useReactivateTherapist } from "@/hooks/use-reactivate-therapist";
import { FormState } from "@/lib/types/enums";
import { Button } from "@/components/ui/button";
import { SaveErrorAlert } from "@/components/ui/save-error-alert";
import type { Therapist } from "@shared/types/therapists";

interface Props {
  therapist: Therapist;
}

export function ReactivateTherapistDialog({ therapist }: Props) {
  const {
    showDialog,
    formState,
    saveError,
    openDialog,
    dismissDialog,
    handleReactivate,
  } = useReactivateTherapist(therapist);

  const saving = formState === FormState.Saving;

  return (
    <Dialog.Root open={showDialog} onOpenChange={(open) => { if (!open) { dismissDialog(); } }}>
      <Dialog.Trigger asChild>
        <Button onClick={openDialog}>Reactivate</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="bg-background fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border p-6">
          <Dialog.Title className="text-lg font-semibold">Reactivate Therapist</Dialog.Title>
          <Dialog.Description className="text-muted-foreground text-sm">
            Are you sure you want to reactivate {therapist.first_name} {therapist.last_name}?
          </Dialog.Description>

          <SaveErrorAlert message={saveError} />

          <div className="flex gap-3">
            <Button onClick={handleReactivate} disabled={saving}>
              {saving ? "Reactivating…" : "Confirm Reactivate"}
            </Button>
            <Dialog.Close asChild>
              <Button variant="outline" disabled={saving} onClick={dismissDialog}>
                Cancel
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
